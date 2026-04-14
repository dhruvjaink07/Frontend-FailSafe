import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import fg from 'fast-glob'
import FlexSearch from 'flexsearch'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DOCS_DIR = path.join(ROOT, 'app', '(docs)', 'docs')
const OUT_FILE = path.join(ROOT, 'public', 'docs-search-index.json')

async function readFileSafe(p) {
  try { return await fs.readFile(p, 'utf8') } catch (e) { return '' }
}

async function build() {
  const entries = await fg(['**/*.{md,mdx,tsx,ts,jsx,js,html}'], { cwd: DOCS_DIR, absolute: true })
  const index = new FlexSearch.Document({
    tokenize: 'forward',
    cache: true,
    document: {
      id: 'id',
      index: ['title', 'body'],
      store: ['title','href','excerpt']
    }
  })

  const out = []
  let id = 1
  for (const file of entries) {
    const rel = path.relative(DOCS_DIR, file)
    // normalize Windows backslashes and strip extensions
    let href = '/docs/' + rel.replace(/\\/g, '/').replace(/\.(mdx|md|tsx|ts|jsx|js|html)$/, '')
    // if file is a `page` file (e.g. `android/page.tsx`), collapse to directory route `/docs/android`
    if (href.endsWith('/page')) href = href.replace(/\/page$/, '')
    const content = await readFileSafe(file)
    // crude title extraction: first markdown heading or filename
    let title = (content.match(/^#\s+(.+)$/m) || [])[1]
    if (!title) title = path.basename(rel).replace(/\.(mdx|md|tsx|ts|jsx|js|html)$/, '')
    const body = content.replace(/<[^>]+>/g, ' ') // strip tags
    const excerpt = body.slice(0, 300).replace(/\s+/g, ' ').trim()

    const doc = { id, title, href, body, excerpt }
    index.add(doc)
    out.push({ id, title, href, excerpt })
    id++
  }

  // Export index + small store
  const exportObj = { docs: out }
  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true })
  await fs.writeFile(OUT_FILE, JSON.stringify(exportObj, null, 2), 'utf8')
  console.log('Built docs index ->', OUT_FILE)
}

build().catch((err) => { console.error(err); process.exit(1) })
