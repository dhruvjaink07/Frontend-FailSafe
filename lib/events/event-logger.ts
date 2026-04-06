type EventName = "experiment_started" | "experiment_stop_clicked" | "error_occurred" | "session_disconnected"

export interface RuntimeEvent {
  name: EventName
  timestamp: string
  payload?: Record<string, unknown>
}

const MAX_EVENTS = 500
const eventBuffer: RuntimeEvent[] = []

export function logEvent(name: EventName, payload?: Record<string, unknown>): void {
  eventBuffer.push({
    name,
    timestamp: new Date().toISOString(),
    payload,
  })
  if (eventBuffer.length > MAX_EVENTS) {
    eventBuffer.splice(0, eventBuffer.length - MAX_EVENTS)
  }
}

export function getEvents(): RuntimeEvent[] {
  return [...eventBuffer]
}
