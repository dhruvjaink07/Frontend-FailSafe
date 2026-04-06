import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export const metadata = {
  title: "Error Handling | FailSafe Documentation",
  description: "Verified API error format and troubleshooting guidance",
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm">
      <pre className="whitespace-pre-wrap">{children}</pre>
    </div>
  )
}

export default function ErrorsPage() {
  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <Badge variant="secondary">Error Handling</Badge>
        <h1 className="text-4xl font-bold tracking-tight">Errors & Troubleshooting</h1>
        <p className="text-xl leading-relaxed text-muted-foreground">
          FailSafe returns structured errors with consistent fields across all endpoints.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="border-b border-border pb-2 text-2xl font-semibold tracking-tight">Standard Error Format</h2>
        <Card>
          <CardHeader><CardTitle className="text-lg">Verified Error Payload</CardTitle></CardHeader>
          <CardContent>
            <CodeBlock>{`{
  "error": "string (error message)",
  "code": "string (error code)",
  "status": "integer (HTTP status)",
  "details": "string (optional)"
}`}</CodeBlock>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="border-b border-border pb-2 text-2xl font-semibold tracking-tight">Status Codes</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Meaning</TableHead>
              <TableHead>Typical Cause</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow><TableCell className="font-mono">200</TableCell><TableCell>Success</TableCell><TableCell className="text-muted-foreground">Request completed</TableCell></TableRow>
            <TableRow><TableCell className="font-mono">201</TableCell><TableCell>Created</TableCell><TableCell className="text-muted-foreground">Resource created</TableCell></TableRow>
            <TableRow><TableCell className="font-mono">202</TableCell><TableCell>Accepted</TableCell><TableCell className="text-muted-foreground">Metrics ingested</TableCell></TableRow>
            <TableRow><TableCell className="font-mono">400</TableCell><TableCell>Bad Request</TableCell><TableCell className="text-muted-foreground">Invalid payload</TableCell></TableRow>
            <TableRow><TableCell className="font-mono">401</TableCell><TableCell>Unauthorized</TableCell><TableCell className="text-muted-foreground">Missing API key</TableCell></TableRow>
            <TableRow><TableCell className="font-mono">404</TableCell><TableCell>Not Found</TableCell><TableCell className="text-muted-foreground">Invalid experiment ID</TableCell></TableRow>
            <TableRow><TableCell className="font-mono">500</TableCell><TableCell>Server Error</TableCell><TableCell className="text-muted-foreground">Backend error</TableCell></TableRow>
            <TableRow><TableCell className="font-mono">503</TableCell><TableCell>Unavailable</TableCell><TableCell className="text-muted-foreground">Docker or dependency unavailable</TableCell></TableRow>
          </TableBody>
        </Table>
      </section>

      <section className="space-y-4">
        <h2 className="border-b border-border pb-2 text-2xl font-semibold tracking-tight">Frontend Error Handling</h2>
        <Card>
          <CardHeader><CardTitle className="text-lg">Common Frontend Cases</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <ul className="list-disc list-inside space-y-2">
              <li>Network failure: polling request times out or cannot reach backend</li>
              <li>Auth failure: API key missing or invalid</li>
              <li>Invalid payload: request body missing required fields</li>
              <li>Backend crash: 500-level error from orchestration or metrics service</li>
            </ul>
            <CodeBlock>{`try {
  const response = await fetch(url, options)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error)
  }

  return await response.json()
} catch (err) {
  console.error("API Error:", err.message)
}`}</CodeBlock>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
