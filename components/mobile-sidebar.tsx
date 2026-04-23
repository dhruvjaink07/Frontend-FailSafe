"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, Shield } from "lucide-react"
import {
  LayoutDashboard,
  FlaskConical,
  History,
  BarChart3,
  ScrollText,
  Server,
  Settings,
  Brain,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

const navigation = [
  { name: "Insights", href: "/dashboard", icon: LayoutDashboard },
  { name: "Experiments", href: "/experiments/create", icon: FlaskConical },
  { name: "History", href: "/experiments/history", icon: History },
  { name: "Logs", href: "/logs", icon: ScrollText },
  { name: "Environment", href: "/environment", icon: Server },
  // ML Insights moved to Dashboard; removed standalone nav entry
  { name: "Settings", href: "/settings", icon: Settings },
]

export function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  let activeHref =
    navigation
      .filter((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null

  if (!activeHref && pathname?.startsWith("/experiments")) {
    activeHref = "/experiments/create"
  }

  return (
    <>
      {/* Mobile Header */}
      <header className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(true)}
            className="h-9 w-9"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-semibold">FailSafe</span>
        </div>
        <ThemeToggle />
      </header>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-64 transform border-r border-border bg-background transition-transform duration-200 ease-in-out lg:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold">FailSafe</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-9 w-9"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close menu</span>
          </Button>
        </div>

        <nav className="p-4">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive = item.href === activeHref
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-accent text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
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
      </div>
    </>
  )
}
