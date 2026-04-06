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
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Topbar } from "@/components/topbar"
import { 
  Key,
  Plus,
  Copy,
  Trash2,
  Shield,
  Eye,
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
  const { setCurrentRole } = useAppStore()

  useEffect(() => {
    // Load cached keys from localStorage on mount
    const cached = listCachedApiKeys()
    setApiKeys(cached)
  }, [])


  async function handleCreate() {
    if (!newKeyName) return
    
    setCreating(true)
    try {
      const newKey = await requestClient<Record<string, string>>("/api/api-keys", {
        method: "POST",
        body: JSON.stringify({
          name: newKeyName,
          role: newKeyRole,
          key: newKeyValue.trim() || undefined,
        }),
      })
        const id = newKey.id || Math.random().toString(36).substring(2, 11)
        
        // Cache the newly created key metadata
        const fullKey = newKey.key || newKey.api_key || newKey.token || ""
        const cachedMeta = {
          id,
          name: newKeyName,
          role: newKeyRole,
          key: fullKey,
          createdAt: new Date().toISOString(),
          lastUsed: null as string | null,
        }
        cacheApiKeyMeta(cachedMeta)
        
        // Automatically set as active key for all API endpoints
        setApiKey(fullKey)
        setCurrentRole(newKeyRole)
        
        // Show the full key once for copying
        setNewlyCreatedKey(fullKey)
        
        // Add to UI with masked display
        setApiKeys(prev => [...prev, { ...cachedMeta, key: maskApiKey(cachedMeta.key) }])
        setError(null)
    } catch (error) {
      console.error("Failed to create API key:", error)
      setError("Failed to create API key")
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      // Remove from cache immediately
      removeCachedApiKey(id)
      // Update UI
      setApiKeys(prev => prev.filter(k => k.id !== id))
    } catch (error) {
      console.error("Failed to delete API key:", error)
    }
  }

  function handleCopy() {
    if (newlyCreatedKey) {
      navigator.clipboard.writeText(newlyCreatedKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
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
          {/* Create New Key */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>API Key Management</CardTitle>
                  <CardDescription>
                    Create and manage API keys for programmatic access
                  </CardDescription>
                </div>
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
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
                            <Input
                              value={newlyCreatedKey}
                              readOnly
                              className="font-mono"
                            />
                            <Button variant="outline" size="icon" onClick={handleCopy}>
                              {copied ? (
                                <CheckCircle className="h-4 w-4 text-success" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <div className="rounded-lg border border-warning/20 bg-warning/10 p-3">
                            <p className="text-sm text-warning">
                              Make sure to store this key securely. It will not be shown again.
                            </p>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              if (newlyCreatedKey) {
                                setApiKey(newlyCreatedKey)
                                setCurrentRole(newKeyRole)
                              }
                            }}
                          >
                            Use For This Session
                          </Button>
                          <Button onClick={handleCloseDialog}>Done</Button>
                        </DialogFooter>
                      </>
                    ) : (
                      <>
                        <DialogHeader>
                          <DialogTitle>Create New API Key</DialogTitle>
                          <DialogDescription>
                            Generate a new API key for accessing the FailSafe API
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="key-name">Key Name</Label>
                            <Input
                              id="key-name"
                              placeholder="e.g., CI/CD Pipeline"
                              value={newKeyName}
                              onChange={(e) => setNewKeyName(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Role</Label>
                            <Select value={newKeyRole} onValueChange={(v) => setNewKeyRole(v as Role)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="viewer">
                                  <div className="flex items-center gap-2">
                                    <Eye className="h-4 w-4" />
                                    Viewer - Read-only access
                                  </div>
                                </SelectItem>
                                <SelectItem value="engineer">
                                  <div className="flex items-center gap-2">
                                    <Code className="h-4 w-4" />
                                    Engineer - Create and run experiments
                                  </div>
                                </SelectItem>
                                <SelectItem value="admin">
                                  <div className="flex items-center gap-2">
                                    <Shield className="h-4 w-4" />
                                    Admin - Full access
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="backend-key">Existing Backend API Key (Optional)</Label>
                            <Input
                              id="backend-key"
                              placeholder="Paste backend key to use it directly"
                              value={newKeyValue}
                              onChange={(e) => setNewKeyValue(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                              If empty, FailSafe generates a local key. Paste your backend key here for real backend auth.
                            </p>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={handleCloseDialog}>
                            Cancel
                          </Button>
                          <Button onClick={handleCreate} disabled={creating || !newKeyName}>
                            {creating ? "Creating..." : "Create Key"}
                          </Button>
                        </DialogFooter>
                      </>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
              {apiKeys.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Key className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">No API keys found</p>
                  <p className="text-sm text-muted-foreground">
                    Create your first API key to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {apiKeys.map((apiKey) => {
                    const RoleIcon = getRoleIcon(apiKey.role)
                    return (
                      <div
                        key={apiKey.id}
                        className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <Key className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{apiKey.name}</h4>
                              <Badge variant="outline" className={getRoleColor(apiKey.role)}>
                                <RoleIcon className="mr-1 h-3 w-3" />
                                {apiKey.role}
                              </Badge>
                            </div>
                            <p className="mt-1 font-mono text-sm text-muted-foreground">
                              {apiKey.key}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Created {formatDate(apiKey.createdAt)}
                              {apiKey.lastUsed && ` · Last used ${formatDate(apiKey.lastUsed)}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:shrink-0">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete &quot;{apiKey.name}&quot;? This action cannot be undone and any applications using this key will stop working.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(apiKey.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
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

          {/* Usage Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Using API Keys</CardTitle>
              <CardDescription>How to authenticate with the FailSafe API</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <p className="text-sm font-medium">HTTP Header</p>
                <pre className="mt-2 overflow-x-auto font-mono text-sm text-muted-foreground">
                  x-api-key: fs_your_api_key_here
                </pre>
              </div>
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <p className="text-sm font-medium">cURL Example</p>
                <pre className="mt-2 overflow-x-auto font-mono text-sm text-muted-foreground">
{`curl -X GET \\
  -H "x-api-key: fs_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  https://your-domain.com/api/experiments`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
