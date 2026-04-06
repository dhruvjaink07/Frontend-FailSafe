import { z } from "zod"

const commonExperimentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  platform: z.enum(["backend", "frontend", "android"]),
  faultType: z.string().min(1),
  targets: z.array(z.string().min(1)).min(1, "At least one target is required"),
  duration: z.number().int().positive("Duration must be greater than 0"),
  adaptive: z.boolean(),
  stepIntensity: z.number().int().min(1).max(100),
  maxIntensity: z.number().int().min(1).max(100),
  expectedBehavior: z.object({
    notCrash: z.boolean(),
    shouldRecover: z.boolean(),
  }),
})

const frontendExperimentSchema = commonExperimentSchema.extend({
  platform: z.literal("frontend"),
  frontendRun: z.object({
    baseUrl: z.string().url("Base URL must be a valid URL"),
    metricsEndpoint: z.string().url("Metrics endpoint must be a valid URL"),
    targetUrls: z.array(z.string().min(1)).min(1, "At least one target URL is required"),
  }),
})

const backendExperimentSchema = commonExperimentSchema.extend({
  platform: z.literal("backend"),
  observedEndpoints: z.array(z.string().min(1)).min(1, "At least one observed endpoint is required"),
})

const androidExperimentSchema = commonExperimentSchema.extend({
  platform: z.literal("android"),
  apk: z.string().min(1, "APK id is required"),
  androidRun: z.object({
    avdName: z.string().min(1, "AVD name is required"),
    headless: z.boolean(),
    resetAppState: z.boolean().optional(),
  }),
})

export const experimentFormSchema = z.discriminatedUnion("platform", [
  frontendExperimentSchema,
  backendExperimentSchema,
  androidExperimentSchema,
])

export function validateExperimentForm(payload: unknown) {
  return experimentFormSchema.safeParse(payload)
}

export function isValidTargetUrl(target: string): boolean {
  if (target.startsWith("/")) return true
  try {
    const parsed = new URL(target)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}
