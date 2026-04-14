#!/usr/bin/env node
import process from 'process'

function usage() {
  console.log('Usage: node scripts/test-backend-logs.mjs --id <EXP_ID> --key <API_KEY> [--tail N]')
  process.exit(1)
}

const argv = process.argv.slice(2)
const args = {}
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) {
    const k = argv[i].slice(2)
    const v = argv[i+1]
    args[k] = v
    i++
  }
}

const EXP_ID = args.id || process.env.EXP_ID
const API_KEY = args.key || process.env.API_KEY
const TAIL = args.tail || process.env.TAIL || '200'

if (!EXP_ID || !API_KEY) usage()

const url = `http://localhost:8000/experiments/backend/logs?id=${encodeURIComponent(EXP_ID)}&tail=${encodeURIComponent(TAIL)}`

async function run() {
  try {
    console.log('Requesting', url)
    const res = await fetch(url, { headers: { 'x-api-key': API_KEY } })
    console.log('Status:', res.status, res.statusText)
    const ct = res.headers.get('content-type') || ''
    console.log('Content-Type:', ct)
    if (res.ok) {
      const text = await res.text()
      const lines = text.split('\n').filter(Boolean)
      console.log('Total lines:', lines.length)
      console.log('--- First 10 lines ---')
      lines.slice(0, 10).forEach((l, i) => console.log(i+1, l))
      if (lines.length > 10) {
        console.log('--- Last 10 lines ---')
        lines.slice(-10).forEach((l, i) => console.log(lines.length-9 + i, l))
      }
    } else {
      const body = await res.text()
      console.error('Error body:', body)
      process.exit(2)
    }
  } catch (e) {
    console.error('Request failed:', e)
    process.exit(3)
  }
}

run()
