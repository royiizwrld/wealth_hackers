export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          created_at: string
          device: string | null
          event: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device?: string | null
          event: string
          id?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          device?: string | null
          event?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_settings: {
        Row: {
          budgets: Json
          categories: string[]
          currency: string
          goal: number
          palette: string
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budgets?: Json
          categories?: string[]
          currency?: string
          goal?: number
          palette?: string
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          budgets?: Json
          categories?: string[]
          currency?: string
          goal?: number
          palette?: string
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          id: string
          note: string | null
          original_amount: number | null
          original_currency: string | null
          sample: boolean
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          date: string
          id?: string
          note?: string | null
          original_amount?: number | null
          original_currency?: string | null
          sample?: boolean
          type: string
          user_id?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          original_amount?: number | null
          original_currency?: string | null
          sample?: boolean
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          failures: number
          first_failed_at: string
          key_hash: string
          locked_until: string | null
        }
        Insert: {
          failures?: number
          first_failed_at?: string
          key_hash: string
          locked_until?: string | null
        }
        Update: {
          failures?: number
          first_failed_at?: string
          key_hash?: string
          locked_until?: string | null
        }
        Relationships: []
      }
      mfa_backup_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ai_data_enabled: boolean
          budgets: Json
          created_at: string
          currency: string
          first_name: string
          id: string
          inactivity_minutes: number
          last_name: string | null
          monthly_savings_goal: number
          palette: string
          terms_accepted_at: string | null
          terms_version: string | null
          theme: string
          updated_at: string
        }
        Insert: {
          ai_data_enabled?: boolean
          budgets?: Json
          created_at?: string
          currency?: string
          first_name?: string
          id: string
          inactivity_minutes?: number
          last_name?: string | null
          monthly_savings_goal?: number
          palette?: string
          terms_accepted_at?: string | null
          terms_version?: string | null
          theme?: string
          updated_at?: string
        }
        Update: {
          ai_data_enabled?: boolean
          budgets?: Json
          created_at?: string
          currency?: string
          first_name?: string
          id?: string
          inactivity_minutes?: number
          last_name?: string | null
          monthly_savings_goal?: number
          palette?: string
          terms_accepted_at?: string | null
          terms_version?: string | null
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          bucket: string
          count: number
          user_id: string
          window_start: string
        }
        Insert: {
          bucket: string
          count?: number
          user_id: string
          window_start: string
        }
        Update: {
          bucket?: string
          count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rate_limit: {
        Args: { _bucket: string; _max: number; _window_seconds: number }
        Returns: boolean
      }
      list_my_sessions: {
        Args: never
        Returns: {
          created_at: string
          id: string
          ip: string
          is_current: boolean
          updated_at: string
          user_agent: string
        }[]
      }
      mfa_ok: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
