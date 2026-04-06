"use client"

import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

interface TopbarProps {
  title: string
  description?: string
  action?: {
    label: string
    href: string
  }
}

export function Topbar({ title, description, action }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          {description && (
            <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          {action && (
            <Button asChild size="sm" className="min-w-0 sm:min-w-[10rem]">
              <Link href={action.href}>
                <Plus className="mr-2 h-4 w-4" />
                <span className="truncate">{action.label}</span>
              </Link>
            </Button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
