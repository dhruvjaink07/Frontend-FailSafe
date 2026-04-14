"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FlaskConical,
  History,
  BarChart3,
  ScrollText,
  Server,
  Settings,
  Shield,
  BookOpen,
  LogOut,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { clearAuthToken } from "@/lib/security/auth"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Experiments", href: "/experiments", icon: FlaskConical },
  { name: "History", href: "/experiments/history", icon: History },
  { name: "Metrics", href: "/metrics", icon: BarChart3 },
  { name: "Logs", href: "/logs", icon: ScrollText },
  { name: "Environment", href: "/environment", icon: Server },
  { name: "Documentation", href: "/docs", icon: BookOpen },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const activeHref =
    navigation
      .filter((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-sidebar-border bg-sidebar">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
          <Shield className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold text-sidebar-foreground">
            FailSafe
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive = item.href === activeHref
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex flex-col gap-2">
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === "/settings"
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>

            <button
              onClick={async () => {
                try { await fetch("/api/auth/signout", { method: "POST" }) } catch {}
                try { clearAuthToken() } catch {}
                router.push("/signin")
              }}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
