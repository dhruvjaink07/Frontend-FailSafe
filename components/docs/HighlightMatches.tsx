"use client"

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

// Client-side DOM highlighter for docs pages. Finds text nodes containing the query
// and wraps matched terms in <mark data-search> elements. Cleans up previous marks
// on each run.
export default function HighlightMatches() {
  const searchParams = useSearchParams()
  const q = searchParams?.get('q') || ''

  useEffect(() => {
    if (!q) return
    const root = document.getElementById('docs-content')
    if (!root) return

    // remove existing marks we added before
    const existing = root.querySelectorAll('mark[data-search]')
    existing.forEach((m) => {
      const parent = m.parentNode
      if (!parent) return
      parent.replaceChild(document.createTextNode(m.textContent || ''), m)
    })

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null)
    const needle = q.trim()
    if (!needle) return
    const re = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig')

    const toHighlight: Text[] = []
    let node = walker.nextNode() as Text | null
    while (node) {
      if (node.nodeValue && re.test(node.nodeValue)) {
        toHighlight.push(node)
      }
      node = walker.nextNode() as Text | null
    }

    toHighlight.forEach((textNode) => {
      const frag = document.createDocumentFragment()
      const parts = textNode.nodeValue!.split(re)
      const matches = textNode.nodeValue!.match(re) || []
      for (let i = 0; i < parts.length; i++) {
        frag.appendChild(document.createTextNode(parts[i]))
        if (i < matches.length) {
          const mark = document.createElement('mark')
          mark.setAttribute('data-search', '1')
          mark.textContent = matches[i]
          mark.style.backgroundColor = '#fff59d'
          mark.style.color = '#000'
          frag.appendChild(mark)
        }
      }
      textNode.parentNode?.replaceChild(frag, textNode)
    })

    // scroll first match into view
    const first = root.querySelector('mark[data-search]') as HTMLElement | null
    if (first) {
      first.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    // no cleanup necessary beyond next run which removes marks at start
  }, [q])

  return null
}
