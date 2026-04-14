"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  BookOpen,
  Zap,
  FlaskConical,
  Code2,
  Monitor,
  Server,
  Smartphone,
  FileJson,
  AlertTriangle,
  Menu,
  Search,
  ChevronRight,
  Home,
} from "lucide-react"
import { useState, useMemo } from "react"
import dynamic from 'next/dynamic'

const DocsSearch = dynamic(() => import('@/components/docs/DocsSearch'), { ssr: false })
const HighlightMatches = dynamic(() => import('@/components/docs/HighlightMatches'), { ssr: false })

const navItems = [
  {
    title: "Getting Started",
    href: "/docs",
    icon: BookOpen,
    items: [
      { title: "What is FailSafe", href: "/docs#what-is-failsafe" },
      { title: "How it works", href: "/docs#how-it-works" },
      { title: "First experiment", href: "/docs#first-experiment" },
    ],
  },
  {
    title: "Core Concepts",
    href: "/docs/concepts",
    icon: Zap,
    items: [
      { title: "Experiment lifecycle", href: "/docs/concepts#lifecycle" },
      { title: "Fault types", href: "/docs/concepts#fault-types" },
      { title: "Intensity model", href: "/docs/concepts#intensity" },
      { title: "Adaptive testing", href: "/docs/concepts#adaptive" },
    ],
  },
  {
    title: "Experiments Guide",
    href: "/docs/experiments",
    icon: FlaskConical,
    items: [
      { title: "Backend testing", href: "/docs/experiments#backend" },
      { title: "Frontend testing", href: "/docs/experiments#frontend" },
      { title: "Android testing", href: "/docs/experiments#android" },
    ],
  },
  {
    title: "API Reference",
    href: "/docs/api",
    icon: Code2,
    items: [
      { title: "Authentication", href: "/docs/api#auth" },
      { title: "Start Experiment", href: "/docs/api#start" },
      { title: "Get Status", href: "/docs/api#status" },
      { title: "Get Metrics", href: "/docs/api#metrics" },
      { title: "Stop Experiment", href: "/docs/api#stop" },
    ],
  },
  {
    title: "Frontend Testing",
    href: "/docs/frontend",
    icon: Monitor,
    items: [
      { title: "Metrics collector", href: "/docs/frontend#collector" },
      { title: "Web Vitals", href: "/docs/frontend#vitals" },
    ],
  },
  {
    title: "Backend Testing",
    href: "/docs/backend",
    icon: Server,
    items: [
      { title: "Docker targets", href: "/docs/backend#docker" },
      { title: "Fault types", href: "/docs/backend#faults" },
    ],
  },
  {
    title: "Android Testing",
    href: "/docs/android",
    icon: Smartphone,
    items: [
      { title: "APK upload", href: "/docs/android#apk" },
      { title: "Emulator setup", href: "/docs/android#emulator" },
    ],
  },
  {
    title: "Response Structures",
    href: "/docs/responses",
    icon: FileJson,
  },
  {
    title: "Errors",
    href: "/docs/errors",
    icon: AlertTriangle,
  },
]

function DocsSidebar({ className }: { className?: string }) {
  const pathname = usePathname()
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return navItems
    return navItems
      .map((item) => {
        const matchesTop = item.title.toLowerCase().includes(q)
        const matchedSub = item.items ? item.items.filter((s) => s.title.toLowerCase().includes(q)) : []
        if (matchesTop) return { ...item, items: item.items }
        if (matchedSub.length) return { ...item, items: matchedSub }
        return null
      })
      .filter(Boolean) as typeof navItems
  }, [query])

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="p-4 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          FailSafe
        </Link>
      </div>
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <div className="pl-9">
            <DocsSearch />
          </div>
        </div>
      </div>
      <ScrollArea className="flex-1 px-4">
        <nav className="space-y-1 pb-8">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No results. Try different keywords.</p>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")

              return (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                  {item.items && isActive && (
                    <div className="ml-7 mt-1 space-y-1 border-l border-border pl-3">
                      {item.items.map((subItem) => (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          className="block py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {subItem.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </nav>
      </ScrollArea>
    </div>
  )
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="sticky top-0 z-50 lg:hidden border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 h-14">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-80">
              <DocsSidebar />
            </SheetContent>
          </Sheet>
          <Link href="/docs" className="font-semibold">
            FailSafe Docs
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 border-r border-border bg-background">
          <DocsSidebar />
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:ml-64">
          <div className="sticky top-0 z-40 hidden lg:flex items-center justify-between px-6 h-14 border-b border-border bg-background/95 backdrop-blur">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/dashboard" className="hover:text-foreground transition-colors flex items-center gap-1">
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground">Documentation</span>
            </div>
            <ThemeToggle />
          </div>
          <div id="docs-content" className="max-w-4xl mx-auto px-6 py-8">
            {children}
          </div>
          <HighlightMatches />
        </main>
      </div>
    </div>
  )
}
