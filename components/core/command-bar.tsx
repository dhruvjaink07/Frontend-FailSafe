"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command"

export function CommandBar() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isPaletteKey = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k"
      if (!isPaletteKey) return
      event.preventDefault()
      setOpen((current) => !current)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const go = (path: string) => {
    setOpen(false)
    router.push(path)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Run quick action..." />
      <CommandList>
        <CommandEmpty>No actions found.</CommandEmpty>
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => go("/experiments/create")}>Start test<CommandShortcut>Ctrl+K</CommandShortcut></CommandItem>
          <CommandItem onSelect={() => go("/settings/notifications")}>Open notifications config</CommandItem>
          <CommandItem onSelect={() => go("/logs")}>Open logs</CommandItem>
          <CommandItem onSelect={() => go("/environment")}>Switch project</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
