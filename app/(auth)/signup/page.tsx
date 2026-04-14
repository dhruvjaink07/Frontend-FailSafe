"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { requestClient, buildApiUrl } from "@/lib/api/request-client"
import { setAuthToken } from "@/lib/security/auth"

export default function SignUpPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const payload = await requestClient(buildApiUrl(`/auth/signup`), {
        method: "POST",
        body: JSON.stringify({ email, name, password }),
      })

      // Backend returns user_id on success. Optionally sign in automatically.
      // If backend also returns a token, store it.
      const token = (payload as any)?.token
      if (typeof token === "string" && token) {
        setAuthToken(token)
        router.push("/")
        return
      }

      // If no token, redirect to sign-in page
      router.push("/signin")
    } catch (err: any) {
      setError(err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl mb-4">Sign up</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm">Name</label>
          <input className="w-full" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
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
            {loading ? "Signing up…" : "Sign up"}
          </button>
        </div>
      </form>
    </main>
  )
}
