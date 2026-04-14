"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Topbar } from "@/components/topbar"
import { useRouter } from "next/navigation"
import { clearAuthToken } from "@/lib/security/auth"
import {
  Key,
  Plus,
  Copy,
  Trash2,
  Shield,
  Eye,
  EyeOff,
  Code,
  CheckCircle,
} from "lucide-react"
import type { ApiKey } from "@/lib/api"
import { cacheApiKeyMeta, listCachedApiKeys, maskApiKey, removeCachedApiKey, setApiKey } from "@/lib/security/api-key-store"
import { useAppStore } from "@/lib/store"
import { requestClient } from "@/lib/api/request-client"

type Role = "viewer" | "engineer" | "admin"

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [error, setError] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [newKeyRole, setNewKeyRole] = useState<Role>("viewer")
  const [newKeyValue, setNewKeyValue] = useState("")
  const [creating, setCreating] = useState(false)
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [rotatedKey, setRotatedKey] = useState<string | null>(null)
  const [snippetCopied, setSnippetCopied] = useState<string | null>(null)
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({})
  const [keyCopiedId, setKeyCopiedId] = useState<string | null>(null)
  const [rotateDialogOpen, setRotateDialogOpen] = useState(false)
  const [rotating, setRotating] = useState(false)
  const [disabledRotateIds, setDisabledRotateIds] = useState<Record<string, boolean>>({})
  const { setCurrentRole } = useAppStore()
  const router = useRouter()

  useEffect(() => {
    const cached = listCachedApiKeys()
    setApiKeys(cached)
  }, [])

  async function handleCreate() {
    const name = newKeyName.trim()
    if (!name) {
      setError("Please provide a name for the API key")
      return
    }
    setCreating(true)
    try {
      const newKey = await requestClient<Record<string, string>>("/api/api-keys", {
        method: "POST",
        body: JSON.stringify({
          name,
          role: newKeyRole,
          key: newKeyValue.trim() || undefined,
        }),
      })

      const id = newKey.id || Math.random().toString(36).substring(2, 11)
      const fullKey = newKey.key || newKey.api_key || newKey.token || ""
      const cachedMeta = {
        id,
        name: newKeyName,
        role: newKeyRole,
        key: fullKey,
        createdAt: new Date().toISOString(),
        lastUsed: undefined as string | undefined,
      }
      cacheApiKeyMeta(cachedMeta)
      setApiKey(fullKey)
      setCurrentRole(newKeyRole)
      setNewlyCreatedKey(fullKey)
      setApiKeys(prev => [...prev, cachedMeta])
      setError(null)
    } catch (error) {
      console.error("Failed to create API key:", error)
      // requestClient throws a parsed error via parseError()
      const parsed = error as {
        message?: string
        code?: string
        status?: number
        details?: unknown
      }
      let msg = parsed?.message || "Failed to create API key"
      if (parsed?.status) msg = `${msg} (status ${parsed.status})`
      if (parsed?.details) {
        try {
          const d = typeof parsed.details === "string" ? parsed.details : JSON.stringify(parsed.details)
          msg = `${msg}: ${d}`
        } catch { /* ignore stringify errors */ }
      }
      setError(msg)
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await requestClient(`/api/api-keys/${encodeURIComponent(id)}`, { method: "DELETE" })
    } catch (err) {
      console.error("Failed to delete API key on backend, continuing to remove locally:", err)
    }

    try {
      removeCachedApiKey(id)
      setApiKeys(prev => prev.filter(k => k.id !== id))
    } catch (error) {
      console.error("Failed to remove API key locally:", error)
    }
  }

  async function handleRotate(id: string) {
    try {
      setRotating(true)
      const resp = await requestClient<{ key?: string }>(`/api/api-keys/${encodeURIComponent(id)}/rotate`, { method: "POST" })
      const newKey = resp.key || ""
      if (!newKey) throw new Error("No key returned")

      try {
        const meta = listCachedApiKeys().find(k => k.id === id)
        if (meta) {
          const updated = { ...meta, key: newKey }
          cacheApiKeyMeta(updated)
          setApiKeys(prev => prev.map(k => k.id === id ? { ...k, key: newKey } : k))
        }
      } catch {}

      setRotatedKey(newKey)
      setRotateDialogOpen(true)
    } catch (error) {
      console.error("Failed to rotate API key:", error)
      const parsed = error as {
        message?: string
        code?: string
        status?: number
        details?: unknown
      }
      // If backend returns 404 for rotate, assume rotation not supported for this key and disable button
      if (parsed?.status === 404) {
        setDisabledRotateIds(prev => ({ ...prev, [id]: true }))
      }
      let msg = parsed?.message || "Failed to rotate API key"
      if (parsed?.status) msg = `${msg} (status ${parsed.status})`
      if (parsed?.details) {
        try {
          const d = typeof parsed.details === "string" ? parsed.details : JSON.stringify(parsed.details)
          msg = `${msg}: ${d}`
        } catch {}
      }
      setError(msg)
    } finally {
      setRotating(false)
    }
  }

  async function handleRevoke(id: string) {
    try {
      await requestClient(`/api/api-keys/${encodeURIComponent(id)}/revoke`, { method: "POST" })
      removeCachedApiKey(id)
      setApiKeys(prev => prev.filter(k => k.id !== id))
    } catch (err) {
      console.error("Failed to revoke API key:", err)
    }
  }

  function handleCopy() {
    if (newlyCreatedKey) {
      navigator.clipboard.writeText(newlyCreatedKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function copySnippet(id: string, text: string) {
    try {
      navigator.clipboard.writeText(text)
      setSnippetCopied(id)
      setTimeout(() => setSnippetCopied(null), 2000)
    } catch (e) {
      console.error("Failed to copy snippet", e)
    }
  }

  function toggleReveal(id: string) {
    setRevealedKeys(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function copyKey(id: string) {
    try {
      const meta = listCachedApiKeys().find(k => k.id === id)
      const full = meta?.key || apiKeys.find(k => k.id === id)?.key || ""
      if (!full) return
      navigator.clipboard.writeText(full)
      setKeyCopiedId(id)
      setTimeout(() => setKeyCopiedId(null), 2000)
    } catch (e) {
      console.error("Failed to copy key", e)
    }
  }

  function handleCloseDialog() {
    setCreateDialogOpen(false)
    setNewKeyName("")
    setNewKeyRole("viewer")
    setNewKeyValue("")
    setNewlyCreatedKey(null)
    setCopied(false)
  }

  const getRoleColor = (role: Role) => {
    switch (role) {
      case "admin": return "bg-destructive/10 text-destructive border-destructive/20"
      case "engineer": return "bg-warning/10 text-warning border-warning/20"
      case "viewer": return "bg-info/10 text-info border-info/20"
    }
  }

  const getRoleIcon = (role: Role) => {
    switch (role) {
      case "admin": return Shield
      case "engineer": return Code
      case "viewer": return Eye
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar 
        title="API Keys" 
        description="Manage API access credentials"
      />
      
      <div className="flex-1 p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <Card>
            <CardHeader>
              <div className="flex w-full items-start justify-between gap-4">
                <div>
                  <CardTitle>API Key Management</CardTitle>
                  <CardDescription>Create and manage API keys for programmatic access</CardDescription>
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Key
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      {newlyCreatedKey ? (
                        <>
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <CheckCircle className="h-5 w-5 text-success" />
                              API Key Created
                            </DialogTitle>
                            <DialogDescription>
                              Copy your API key now. You will not be able to see it again.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <Input value={newlyCreatedKey} readOnly className="font-mono" />
                              <Button variant="outline" size="icon" onClick={handleCopy}>
                                {copied ? <CheckCircle className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                              </Button>
                            </div>
                            <div className="rounded-lg border border-warning/20 bg-warning/10 p-3">
                              <p className="text-sm text-warning">Make sure to store this key securely. It will not be shown again.</p>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => { if (newlyCreatedKey) { setApiKey(newlyCreatedKey); setCurrentRole(newKeyRole) } }}>Use For This Session</Button>
                            <Button onClick={handleCloseDialog}>Done</Button>
                          </DialogFooter>
                        </>
                      ) : (
                        <>
                          <DialogHeader>
                            <DialogTitle>Create New API Key</DialogTitle>
                            <DialogDescription>Generate a new API key for accessing the FailSafe API</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="key-name">Key Name</Label>
                              <Input id="key-name" placeholder="e.g., CI/CD Pipeline" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label>Role</Label>
                              <Select value={newKeyRole} onValueChange={(v) => setNewKeyRole(v as Role)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="viewer"><div className="flex items-center gap-2"><Eye className="h-4 w-4" />Viewer - Read-only access</div></SelectItem>
                                  <SelectItem value="engineer"><div className="flex items-center gap-2"><Code className="h-4 w-4" />Engineer - Create and run experiments</div></SelectItem>
                                  <SelectItem value="admin"><div className="flex items-center gap-2"><Shield className="h-4 w-4" />Admin - Full access</div></SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="backend-key">Existing Backend API Key (Optional)</Label>
                              <Input id="backend-key" placeholder="Paste backend key to use it directly" value={newKeyValue} onChange={(e) => setNewKeyValue(e.target.value)} />
                              <p className="text-xs text-muted-foreground">If empty, FailSafe generates a local key. Paste your backend key here for real backend auth.</p>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                            <Button onClick={handleCreate} disabled={creating || !newKeyName}>{creating ? "Creating..." : "Create Key"}</Button>
                          </DialogFooter>
                        </>
                      )}
                    </DialogContent>
                  </Dialog>

                  <Dialog open={rotateDialogOpen} onOpenChange={setRotateDialogOpen}>
                    <DialogContent>
                      {rotatedKey ? (
                        <>
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-success" />API Key Rotated</DialogTitle>
                            <DialogDescription>A new key was generated. Copy it now — it will not be shown again.</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <Input value={rotatedKey} readOnly className="font-mono" />
                              <Button variant="outline" size="icon" onClick={() => navigator.clipboard.writeText(rotatedKey || "")}><Copy className="h-4 w-4" /></Button>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button onClick={() => setRotateDialogOpen(false)}>Done</Button>
                          </DialogFooter>
                        </>
                      ) : (
                        <div className="p-4">Rotating key...</div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
              {apiKeys.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Key className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">No API keys found</p>
                  <p className="text-sm text-muted-foreground">Create your first API key to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                    {apiKeys.map((apiKey) => {
                    const RoleIcon = getRoleIcon(apiKey.role)
                    const revealed = !!revealedKeys[apiKey.id]
                    const meta = listCachedApiKeys().find(k => k.id === apiKey.id)
                    const full = meta?.key || apiKey.key || ""
                    const displayed = revealed ? full : maskApiKey(full)
                    return (
                      <div key={apiKey.id} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-4 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Key className="h-5 w-5 text-primary" /></div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium truncate">{apiKey.name}</h4>
                              <Badge variant="outline" className={getRoleColor(apiKey.role)}>
                                <RoleIcon className="mr-1 h-3 w-3" />{apiKey.role}
                              </Badge>
                            </div>
                            <p className="mt-1 font-mono text-sm text-muted-foreground truncate max-w-full">{displayed}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Created {formatDate(apiKey.createdAt)}{apiKey.lastUsed && ` · Last used ${formatDate(apiKey.lastUsed)}`}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => toggleReveal(apiKey.id)} title={revealed ? "Hide key" : "Reveal key"} aria-label="Reveal key">
                            {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => copyKey(apiKey.id)} title="Copy key" aria-label="Copy key">
                            {keyCopiedId === apiKey.id ? <CheckCircle className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                            onClick={() => handleRotate(apiKey.id)}
                            disabled={rotating || !!disabledRotateIds[apiKey.id]}
                            title={disabledRotateIds[apiKey.id] ? "Rotation not supported" : "Rotate key"}
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => handleRevoke(apiKey.id)} title="Revoke key"><Shield className="h-4 w-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Delete key"><Trash2 className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                                <AlertDialogDescription>Are you sure you want to delete "{apiKey.name}"? This action cannot be undone and any applications using this key will stop working.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(apiKey.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Using API Keys</CardTitle>
              <CardDescription>How to authenticate with the FailSafe API</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium">HTTP Header</p>
                  <Button variant="ghost" size="icon" onClick={() => copySnippet("header", "x-api-key: fs_your_api_key_here") }>
                    {snippetCopied === "header" ? <CheckCircle className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <pre className="mt-2 overflow-x-auto font-mono text-sm text-muted-foreground">x-api-key: fs_your_api_key_here</pre>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium">cURL Example</p>
                  <Button variant="ghost" size="icon" onClick={() => copySnippet("curl", 'curl -X GET\n  -H "x-api-key: fs_your_api_key_here"\n  -H "Content-Type: application/json"\n  https://your-domain.com/api/experiments')}>
                    {snippetCopied === "curl" ? <CheckCircle className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <pre className="mt-2 overflow-x-auto font-mono text-sm text-muted-foreground">{`curl -X GET\n  -H "x-api-key: fs_your_api_key_here"\n  -H "Content-Type: application/json"\n  https://your-domain.com/api/experiments`}</pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
