"use client"

import React from "react"

export type Role = "viewer" | "engineer" | "admin"

interface PermissionGuardProps {
  role: Role
  allow: Role[]
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function PermissionGuard({ role, allow, fallback, children }: PermissionGuardProps) {
  if (!allow.includes(role)) {
    return fallback ?? <span className="text-sm text-muted-foreground">Insufficient permissions.</span>
  }
  return <>{children}</>
}

export function canStartExperiment(role: Role): boolean {
  return role === "engineer" || role === "admin"
}
