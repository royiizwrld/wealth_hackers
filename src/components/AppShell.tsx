import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRightLeft, LayoutDashboard, ListOrdered, MessageCircle, Settings, User, Wallet } from "lucide-react";
import { useFinance } from "@/hooks/use-finance";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { ConverterTool } from "@/components/dashboard/CurrencyConverter";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import logo from "@/assets/wealth-hackers-logo.png.asset.json";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: ListOrdered },
  { to: "/budget", label: "Budgets", icon: Wallet },
  { to: "/converter", label: "Converter", icon: ArrowRightLeft },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useFinance();
  const [fxOpen, setFxOpen] = useState(false);
  const linkCls =
    "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted data-[status=active]:bg-secondary data-[status=active]:text-foreground";
  const tabCls = "flex flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground data-[status=active]:font-medium data-[status=active]:text-primary";
  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/" className="flex min-w-0 items-center gap-2 font-display font-semibold">
            <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md">
              <img src={logo.url} alt="Wealth Hackers logo" className="absolute left-1/2 top-1/2 h-auto w-[170px] max-w-none -translate-x-1/2 -translate-y-[34%]" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm sm:text-lg">Wealth Hackers</span>
              <span className="hidden font-sans text-xs font-normal text-muted-foreground sm:block">Strategic Growth | Digital Insight</span>
            </span>
          </Link>
          <nav className="ml-auto flex items-center gap-1">
            {nav.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} activeOptions={{ exact: true }} className={`hidden md:flex ${linkCls}`}>
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            ))}
            <Link to="/auth" className={linkCls}>
              <User className="h-4 w-4" />
              <span>{user ? "Account" : "Sign in"}</span>
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <Link to="/" activeOptions={{ exact: true }} className={tabCls}><LayoutDashboard className="h-5 w-5" />Home</Link>
        <Link to="/transactions" className={tabCls}><ListOrdered className="h-5 w-5" />Activity</Link>
        <Link to="/budget" className={tabCls}><Wallet className="h-5 w-5" />Budgets</Link>
        <button type="button" onClick={() => setFxOpen(true)} className={tabCls}><ArrowRightLeft className="h-5 w-5" />Convert</button>
        <button type="button" onClick={() => window.dispatchEvent(new Event("open-assistant"))} className={tabCls}><MessageCircle className="h-5 w-5" />Coach</button>
        <Link to="/settings" className={tabCls}><Settings className="h-5 w-5" />Settings</Link>
      </nav>
      <Drawer open={fxOpen} onOpenChange={setFxOpen}>
        <DrawerContent>
          <DrawerHeader><DrawerTitle>Currency converter</DrawerTitle></DrawerHeader>
          <div className="space-y-3 px-4 pb-6">
            <ConverterTool />
            <Link to="/converter" onClick={() => setFxOpen(false)} className="block text-center text-sm text-primary underline">Open full converter with history</Link>
          </div>
        </DrawerContent>
      </Drawer>
      <AssistantPanel />
    </div>
  );
}
