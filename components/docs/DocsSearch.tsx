"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import FlexSearch from 'flexsearch'

type Hit = { id: number; title: string; href: string; excerpt: string }

export default function DocsSearch({ placeholder = 'Search docs...' }: { placeholder?: string }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Hit[]>([])
  const [indexLoaded, setIndexLoaded] = useState(false)
  const [index, setIndex] = useState<any>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await fetch('/docs-search-index.json')
        const payload = await res.json()
        // We only stored docs metadata; use a tiny FlexSearch index client-side for simple ranking
        const idx = new FlexSearch.Index({ tokenize: 'forward' })
        const store: Record<number, Hit> = {}
        for (const doc of payload.docs) {
          idx.add(doc.id, doc.title + ' ' + (doc.excerpt || ''))
          store[doc.id] = doc
        }
        if (!mounted) return
        setIndex({ idx, store })
        setIndexLoaded(true)
      } catch (e) {
        console.warn('Docs search index load failed', e)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!indexLoaded || !index || !query.trim()) { setResults([]); return }
    const ids = index.idx.search(query, 10) as number[]
    const hits = ids.map((id: number) => index.store[id]).filter(Boolean)
    setResults(hits)
  }, [query, indexLoaded, index])

  // normalize hrefs at render time to avoid stale/backslash/page artifacts
  function normalizeHref(h?: string) {
    if (!h) return '/docs'
    let out = h.replace(/\\\\/g, '/') // normalize any double-escaped backslashes
    out = out.replace(/\\/g, '/')
    // collapse trailing /page
    if (out.endsWith('/page')) out = out.replace(/\/page$/, '')
    // ensure it starts with /docs
    if (!out.startsWith('/docs')) {
      if (out.startsWith('/')) out = '/docs' + out
      else out = '/docs/' + out
    }
    return out
  }

  // highlight matched query terms in text
  function escapeRegex(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  function highlightText(text?: string, q?: string) {
    if (!text) return text || ''
    if (!q) return text
    const trimmed = q.trim()
    if (!trimmed) return text
    try {
      const esc = escapeRegex(trimmed)
      const regex = new RegExp(`(${esc})`, 'i')
      const parts = text.split(new RegExp(`(${esc})`, 'ig'))
      return parts.map((part, i) => {
        if (part.match(new RegExp(`^${esc}$`, 'i'))) {
          return (
            <mark key={i} className="bg-yellow-300 text-black px-0 rounded">
              {part}
            </mark>
          )
        }
        return <span key={i}>{part}</span>
      })
    } catch (e) {
      return text
    }
  }

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} className="pl-9 w-full" />
      {results.length > 0 && (
        <div className="mt-2 rounded border bg-background p-2">
          {results.map((r) => {
            let href = normalizeHref(r.href)
            // append query param so the target page can highlight matches
            const q = query.trim()
            if (q) href = href + (href.includes('?') ? '&' : '?') + 'q=' + encodeURIComponent(q)
            return (
              <Link key={r.id} href={href} className="block py-1 text-sm hover:underline">
                <div className="font-medium">{highlightText(r.title, query)}</div>
                <div className="text-xs text-muted-foreground">{highlightText(r.excerpt, query)}</div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
