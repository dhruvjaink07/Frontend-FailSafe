"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

type SchemaField =
  | { type: "number"; label: string; min?: number; max?: number }
  | { type: "boolean"; label: string }
  | { type: "select"; label: string; options: string[] }

export type FormSchema = Record<string, SchemaField>

interface SchemaDrivenFormProps {
  schema: FormSchema
  value: Record<string, unknown>
  onChange: (value: Record<string, unknown>) => void
}

export function SchemaDrivenForm({ schema, value, onChange }: SchemaDrivenFormProps) {
  return (
    <div className="space-y-4">
      {Object.entries(schema).map(([key, field]) => {
        const fieldValue = value[key]

        if (field.type === "number") {
          return (
            <div key={key} className="space-y-2">
              <Label htmlFor={key}>{field.label}</Label>
              <Input
                id={key}
                type="number"
                min={field.min}
                max={field.max}
                value={typeof fieldValue === "number" ? fieldValue : 0}
                onChange={(event) => {
                  const parsed = Number(event.target.value)
                  onChange({ ...value, [key]: Number.isFinite(parsed) ? parsed : 0 })
                }}
              />
            </div>
          )
        }

        if (field.type === "boolean") {
          return (
            <div key={key} className="flex items-center justify-between rounded-lg border border-border p-3">
              <Label htmlFor={key}>{field.label}</Label>
              <Switch
                id={key}
                checked={Boolean(fieldValue)}
                onCheckedChange={(checked) => onChange({ ...value, [key]: checked })}
              />
            </div>
          )
        }

        return (
          <div key={key} className="space-y-2">
            <Label>{field.label}</Label>
            <Select
              value={typeof fieldValue === "string" ? fieldValue : field.options[0]}
              onValueChange={(next) => onChange({ ...value, [key]: next })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {field.options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      })}
    </div>
  )
}
