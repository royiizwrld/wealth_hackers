import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { LayoutDashboard, ListOrdered, Moon, Settings, Sun, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFinance } from "@/hooks/use-finance";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import logo from "@/assets/wealth-hackers-logo.png.asset.json";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: ListOrdered },
  { to: "/budget", label: "Budgets", icon: Wallet },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { theme, setTheme } = useFinance();
  return (
    <div className="min-h-screen pb-24">
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
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: true }}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted data-[status=active]:bg-secondary data-[status=active]:text-foreground"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden md:inline">{label}</span>
              </Link>
            ))}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <AssistantPanel />
    </div>
  );
}
