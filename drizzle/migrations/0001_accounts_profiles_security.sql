
-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT '' CHECK (char_length(first_name) <= 60),
  last_name text CHECK (last_name IS NULL OR char_length(last_name) <= 60),
  theme text NOT NULL DEFAULT 'system' CHECK (theme IN ('light','dark','system')),
  palette text NOT NULL DEFAULT 'default' CHECK (char_length(palette) <= 30),
  currency text NOT NULL DEFAULT 'KES' CHECK (currency ~ '^[A-Z]{3}$'),
  monthly_savings_goal numeric(14,2) NOT NULL DEFAULT 0 CHECK (monthly_savings_goal >= 0 AND monthly_savings_goal < 1000000000000),
  budgets jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(budgets) = 'object'),
  terms_accepted_at timestamptz,
  terms_version text CHECK (terms_version IS NULL OR char_length(terms_version) <= 20),
  ai_data_enabled boolean NOT NULL DEFAULT true,
  inactivity_minutes integer NOT NULL DEFAULT 15 CHECK (inactivity_minutes IN (5,15,30,60)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Categories
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 40),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX categories_user_name_idx ON public.categories (user_id, lower(name));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cat select" ON public.categories FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own cat insert" ON public.categories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own cat update" ON public.categories FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own cat delete" ON public.categories FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Activity log
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  event text NOT NULL CHECK (event IN ('sign_in','sign_out','password_change','email_change','mfa_enabled','mfa_disabled','data_export','data_import','transactions_deleted','account_deleted','backup_code_used','other_sessions_signed_out')),
  device text CHECK (device IS NULL OR char_length(device) <= 300),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activity_log_user_idx ON public.activity_log (user_id, created_at DESC);
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own log select" ON public.activity_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own log insert" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Server-only tables (no client grants, RLS on with no policies)
CREATE TABLE public.rate_limits (
  user_id uuid NOT NULL,
  bucket text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, bucket)
);
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.login_attempts (
  key_hash text PRIMARY KEY,
  failures integer NOT NULL DEFAULT 0,
  first_failed_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz
);
GRANT ALL ON public.login_attempts TO service_role;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.mfa_backup_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code_hash text NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mfa_backup_codes_user_idx ON public.mfa_backup_codes (user_id);
GRANT ALL ON public.mfa_backup_codes TO service_role;
ALTER TABLE public.mfa_backup_codes ENABLE ROW LEVEL SECURITY;

-- Rate limit helper (per signed-in user)
CREATE OR REPLACE FUNCTION public.check_rate_limit(_bucket text, _max integer, _window_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); r public.rate_limits;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  SELECT * INTO r FROM public.rate_limits WHERE user_id = uid AND bucket = _bucket FOR UPDATE;
  IF NOT FOUND OR r.window_start < now() - make_interval(secs => _window_seconds) THEN
    INSERT INTO public.rate_limits (user_id, bucket, window_start, count) VALUES (uid, _bucket, now(), 1)
    ON CONFLICT (user_id, bucket) DO UPDATE SET window_start = now(), count = 1;
    RETURN true;
  END IF;
  IF r.count >= _max THEN RETURN false; END IF;
  UPDATE public.rate_limits SET count = count + 1 WHERE user_id = uid AND bucket = _bucket;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO authenticated;

-- MFA assurance: when a user has a verified factor, data requires an aal2 session
CREATE OR REPLACE FUNCTION public.mfa_ok()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
    OR NOT EXISTS (SELECT 1 FROM auth.mfa_factors f WHERE f.user_id = auth.uid() AND f.status = 'verified')
$$;
REVOKE ALL ON FUNCTION public.mfa_ok() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mfa_ok() TO authenticated;

CREATE POLICY "require mfa tx" ON public.finance_transactions AS RESTRICTIVE FOR ALL TO authenticated USING (public.mfa_ok()) WITH CHECK (public.mfa_ok());
CREATE POLICY "require mfa cat" ON public.categories AS RESTRICTIVE FOR ALL TO authenticated USING (public.mfa_ok()) WITH CHECK (public.mfa_ok());
CREATE POLICY "require mfa profile" ON public.profiles AS RESTRICTIVE FOR ALL TO authenticated USING (public.mfa_ok()) WITH CHECK (public.mfa_ok());
CREATE POLICY "require mfa log" ON public.activity_log AS RESTRICTIVE FOR ALL TO authenticated USING (public.mfa_ok()) WITH CHECK (public.mfa_ok());

-- Sessions list for the signed-in user
CREATE OR REPLACE FUNCTION public.list_my_sessions()
RETURNS TABLE (id uuid, created_at timestamptz, updated_at timestamptz, user_agent text, ip text, is_current boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT s.id, s.created_at, s.updated_at, s.user_agent, host(s.ip), s.id::text = (auth.jwt()->>'session_id')
  FROM auth.sessions s WHERE s.user_id = auth.uid() ORDER BY s.updated_at DESC NULLS LAST LIMIT 50
$$;
REVOKE ALL ON FUNCTION public.list_my_sessions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_sessions() TO authenticated;

-- Transaction validation (server-side)
ALTER TABLE public.finance_transactions ADD CONSTRAINT tx_amount_positive CHECK (amount > 0 AND amount < 1000000000000) NOT VALID;
ALTER TABLE public.finance_transactions ADD CONSTRAINT tx_note_len CHECK (note IS NULL OR char_length(note) <= 500) NOT VALID;
ALTER TABLE public.finance_transactions ADD CONSTRAINT tx_type_valid CHECK (type IN ('income','expense')) NOT VALID;
ALTER TABLE public.finance_transactions ADD CONSTRAINT tx_cat_len CHECK (char_length(category) BETWEEN 1 AND 40) NOT VALID;
ALTER TABLE public.finance_transactions ADD CONSTRAINT tx_orig_currency CHECK (original_currency IS NULL OR original_currency ~ '^[A-Z]{3}$') NOT VALID;

CREATE OR REPLACE FUNCTION public.validate_transaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.date < DATE '1970-01-01' OR NEW.date > (current_date + 366) THEN
    RAISE EXCEPTION 'Invalid transaction date';
  END IF;
  NEW.amount := round(NEW.amount, 2);
  IF NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.user_id = NEW.user_id AND lower(c.name) = lower(NEW.category)) THEN
    RAISE EXCEPTION 'Unknown category';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER finance_transactions_validate BEFORE INSERT OR UPDATE ON public.finance_transactions
FOR EACH ROW EXECUTE FUNCTION public.validate_transaction();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- New user: profile + default categories
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE meta jsonb := coalesce(NEW.raw_user_meta_data, '{}'::jsonb);
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, terms_accepted_at, terms_version)
  VALUES (
    NEW.id,
    left(coalesce(nullif(meta->>'first_name',''), split_part(coalesce(meta->>'full_name', meta->>'name', ''), ' ', 1), ''), 60),
    left(nullif(meta->>'last_name',''), 60),
    CASE WHEN meta ? 'terms_version' THEN now() ELSE NULL END,
    left(meta->>'terms_version', 20)
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.categories (user_id, name)
  SELECT NEW.id, c FROM unnest(ARRAY['Food','Transport','Rent','Utilities','Shopping','Entertainment','Health','Education','Salary','Freelance','Gifts','Other']) AS c
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing accounts
INSERT INTO public.profiles (id, first_name, theme, palette, currency, monthly_savings_goal, budgets)
SELECT u.id,
  left(coalesce(split_part(coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''), ' ', 1), ''), 60),
  CASE WHEN s.theme IN ('light','dark') THEN s.theme ELSE 'system' END,
  coalesce(s.palette, 'default'),
  CASE WHEN s.currency ~ '^[A-Z]{3}$' THEN s.currency ELSE 'KES' END,
  greatest(coalesce(s.goal, 0), 0),
  coalesce(s.budgets, '{}'::jsonb)
FROM auth.users u LEFT JOIN public.finance_settings s ON s.user_id = u.id
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.categories (user_id, name)
SELECT u.id, left(btrim(c), 40)
FROM auth.users u
LEFT JOIN public.finance_settings s ON s.user_id = u.id
CROSS JOIN LATERAL unnest(coalesce(nullif(s.categories, '{}'), ARRAY['Food','Transport','Rent','Utilities','Shopping','Entertainment','Health','Education','Salary','Freelance','Gifts','Other'])) AS c
WHERE char_length(btrim(c)) BETWEEN 1 AND 40
ON CONFLICT DO NOTHING;

INSERT INTO public.categories (user_id, name)
SELECT DISTINCT t.user_id, left(btrim(t.category), 40) FROM public.finance_transactions t
WHERE char_length(btrim(t.category)) BETWEEN 1 AND 40
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.finance_settings IS 'DEPRECATED: replaced by profiles and categories';
