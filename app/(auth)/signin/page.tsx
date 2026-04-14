"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { requestClient, buildApiUrl } from "@/lib/api/request-client"
import { setAuthToken } from "@/lib/security/auth"

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const payload = await requestClient(buildApiUrl(`/auth/signin`), {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })

      const token = (payload as any)?.token
      if (typeof token === "string" && token) {
        setAuthToken(token)
        router.push("/")
        return
      }

      setError("Sign-in did not return a token")
    } catch (err: any) {
      setError(err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl mb-4">Sign in</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm">Email</label>
          <input className="w-full" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">Password</label>
          <input type="password" className="w-full" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error ? <div className="text-red-600">{error}</div> : null}
        <div>
          <button disabled={loading} className="btn-primary">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </form>
    </main>
  )
}
