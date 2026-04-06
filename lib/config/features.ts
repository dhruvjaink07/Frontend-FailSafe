export const features = {
  android: process.env.NEXT_PUBLIC_FEATURE_ANDROID === "true",
  frontend: process.env.NEXT_PUBLIC_FEATURE_FRONTEND !== "false",
  backend: process.env.NEXT_PUBLIC_FEATURE_BACKEND !== "false",
} as const

export type FeaturePlatform = keyof typeof features

export function isPlatformEnabled(platform: FeaturePlatform): boolean {
  return features[platform]
}
