import { NextRequest, NextResponse } from "next/server"
import { normalizeExperiment } from "@/lib/adapters/data-normalizer"
import { getForwardedApiKey } from "@/lib/server/request-auth"

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL ?? "http://localhost:8000"

type HistoryEnvelope = {
  items: Array<Record<string, unknown>>
  count: number
  limit: number
  offset: number
}

function parseLimitOffset(request: NextRequest) {
  const limit = Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? 50))
  const offset = Math.max(0, Number(request.nextUrl.searchParams.get("offset") ?? 0))
  return { limit, offset }
}

function toHistoryItems(records: Array<Record<string, unknown>>) {
  return records.map((record) => {
    const experimentNode =
      record.experiment && typeof record.experiment === "object"
        ? (record.experiment as Record<string, unknown>)
        : record

    const metricsNode =
      record.metrics && typeof record.metrics === "object"
        ? (record.metrics as Record<string, unknown>)
        : ({} as Record<string, unknown>)

    const aggregated = Array.isArray(metricsNode.aggregated)
      ? (metricsNode.aggregated as unknown[])
      : Array.isArray(record.aggregated)
        ? (record.aggregated as unknown[])
        : []

    const raw = Array.isArray(metricsNode.raw)
      ? (metricsNode.raw as unknown[])
      : Array.isArray(record.raw)
        ? (record.raw as unknown[])
        : []

    return {
      experiment: {
        id: String(experimentNode.id ?? record.id ?? ""),
        fault_type: String(experimentNode.fault_type ?? experimentNode.faultType ?? record.fault_type ?? "unknown"),
        target_type: String(experimentNode.target_type ?? experimentNode.targetType ?? experimentNode.platform ?? record.target_type ?? "backend"),
        state: String(experimentNode.state ?? experimentNode.experiment_state ?? record.state ?? "unknown"),
        phase: String(experimentNode.phase ?? record.phase ?? "unknown"),
        created_at: String(experimentNode.created_at ?? experimentNode.createdAt ?? record.created_at ?? ""),
        updated_at: String(
          experimentNode.updated_at ??
            experimentNode.updatedAt ??
            record.updated_at ??
            experimentNode.created_at ??
            experimentNode.createdAt ??
            "",
        ),
      },
      metrics: {
        status_payload: metricsNode.status_payload ?? (record as { status_payload?: unknown }).status_payload ?? null,
        aggregated,
        raw,
      },
      summary: (record as { summary?: unknown }).summary ?? metricsNode.summary ?? null,
    }
  })
}

function normalizeHistoryPayload(payload: unknown, request: NextRequest): HistoryEnvelope {
  const { limit, offset } = parseLimitOffset(request)

  if (Array.isArray(payload)) {
    const normalized = payload
      .map((item) => normalizeExperiment(item as Record<string, unknown>))
      .map((experiment) => ({
        experiment: {
          id: experiment.id,
          fault_type: experiment.faultType,
          target_type: experiment.platform,
          state: experiment.state,
          phase: experiment.phase,
          created_at: experiment.createdAt,
          updated_at: experiment.completedAt ?? experiment.startedAt ?? experiment.createdAt,
        },
        metrics: {
          status_payload: null,
          aggregated: [],
          raw: [],
        },
        summary: null,
      }))

    return {
      items: normalized.slice(offset, offset + limit),
      count: normalized.length,
      limit,
      offset,
    }
  }

  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {}
  const rawItems = Array.isArray(record.items) ? (record.items as Array<Record<string, unknown>>) : []
  const items = toHistoryItems(rawItems)
  // Backend may already return paginated results. Prefer an explicit
  // `total_count` (total records across pages) or a numeric `count` if
  // provided by the backend. If the backend includes pagination hints
  // such as `limit`, `offset`, or `total_count`, treat the returned
  // `items` as already sliced and don't re-slice here. Otherwise fall
  // back to slicing the entire items array according to the requested
  // `limit`/`offset`.
  const backendLimit = typeof record.limit === "number" ? (record.limit as number) : undefined
  const backendOffset = typeof record.offset === "number" ? (record.offset as number) : undefined
  const totalCount = typeof (record as any).total_count === "number" ? (record as any).total_count : typeof record.count === "number" ? (record.count as number) : items.length

  const backendProvidedPaging = backendLimit !== undefined || backendOffset !== undefined || typeof (record as any).total_count === "number"

  if (backendProvidedPaging) {
    return {
      items,
      count: totalCount,
      limit: backendLimit ?? limit,
      offset: backendOffset ?? offset,
    }
  }

  return {
    items: items.slice(offset, offset + limit),
    count: totalCount,
    limit,
    offset,
  }
}

function emptyHistoryEnvelope(request: NextRequest) {
  const { limit, offset } = parseLimitOffset(request)
  return {
    items: [],
    count: 0,
    limit,
    offset,
  }
}

async function fetchHistoryFromExperiments(request: NextRequest) {
  console.log(`[HISTORY FALLBACK] Fetching /experiments from ${BACKEND_BASE_URL}`)
  const apiKey = getForwardedApiKey(request)
  const response = await fetch(`${BACKEND_BASE_URL}/experiments`, {
    cache: "no-store",
    headers: {
      "x-api-key": apiKey,
    },
  })
  console.log(`[HISTORY FALLBACK] /experiments status: ${response.status}`)

  if (!response.ok) {
    console.log("[HISTORY FALLBACK] /experiments not ok, returning empty envelope")
    return emptyHistoryEnvelope(request)
  }

  const payload = await response.json()
  return normalizeHistoryPayload(payload, request)
}

async function fetchNativeHistory(request: NextRequest, includeQuery: boolean) {
  const query = request.nextUrl.searchParams.toString()
  const target = `${BACKEND_BASE_URL}/experiments/history${includeQuery && query ? `?${query}` : ""}`
  console.log(`[HISTORY GET] ${target}`)
  const apiKey = getForwardedApiKey(request)

  const response = await fetch(target, {
    cache: "no-store",
    headers: {
      "x-api-key": apiKey,
    },
  })

  const contentType = response.headers.get("content-type") ?? ""
  console.log(`[HISTORY GET] /experiments/history status: ${response.status}`)

  if (!response.ok || !contentType.includes("application/json")) {
    const errorText = await response.text().catch(() => "")
    return { ok: false as const, status: response.status, errorText }
  }

  const payload = await response.json()
  return { ok: true as const, envelope: normalizeHistoryPayload(payload, request) }
}

export async function GET(request: NextRequest) {
  try {
    const withQuery = await fetchNativeHistory(request, true)
    if (withQuery.ok) {
      console.log(`[HISTORY GET] Returning native history payload (${withQuery.envelope.items.length} items)`)
      return NextResponse.json(withQuery.envelope, { status: 200 })
    }

    if (withQuery.status === 400 && withQuery.errorText) {
      return NextResponse.json(
        {
          error: `Backend history query failed: ${withQuery.errorText}`,
        },
        { status: 502 },
      )
    }

    if (withQuery.status === 400 && request.nextUrl.searchParams.toString()) {
      console.log("[HISTORY GET] Query params rejected by backend; retrying without query")
      const noQuery = await fetchNativeHistory(request, false)
      if (noQuery.ok) {
        console.log(`[HISTORY GET] Returning native history payload after retry (${noQuery.envelope.items.length} items)`)
        return NextResponse.json(noQuery.envelope, { status: 200 })
      }
      if (!noQuery.ok && noQuery.status === 400 && noQuery.errorText) {
        return NextResponse.json(
          {
            error: `Backend history query failed: ${noQuery.errorText}`,
          },
          { status: 502 },
        )
      }
    }

    console.log("[HISTORY GET] Native endpoint unavailable or non-JSON, falling back to /experiments")

    return NextResponse.json(await fetchHistoryFromExperiments(request), { status: 200 })
  } catch (err) {
    console.error("[HISTORY GET] Error, using fallback:", err)
    return NextResponse.json(await fetchHistoryFromExperiments(request), { status: 200 })
  }
}
