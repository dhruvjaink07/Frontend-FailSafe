import { formatDistanceToNowStrict } from "date-fns"

export function toTimestampMs(input: string | number | Date): number {
  if (typeof input === "number") return input < 1e12 ? input * 1000 : input
  if (input instanceof Date) return input.getTime()
  const parsedNumber = Number(input)
  if (Number.isFinite(parsedNumber)) {
    return parsedNumber < 1e12 ? parsedNumber * 1000 : parsedNumber
  }
  return new Date(input).getTime()
}

export function formatRelativeTime(input: string | number | Date): string {
  const date = new Date(toTimestampMs(input))
  if (Number.isNaN(date.getTime())) return "unknown"
  return `${formatDistanceToNowStrict(date)} ago`
}

export function formatClock(input: string | number | Date): string {
  const date = new Date(toTimestampMs(input))
  if (Number.isNaN(date.getTime())) return "--:--:--"
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}
