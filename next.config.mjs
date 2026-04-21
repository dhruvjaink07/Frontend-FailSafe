/** @type {import('next').NextConfig} */
const isGithubPages = process.env.DEPLOY_TARGET === "github-pages"
const repository = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "frontendfailsafe"
const pagesBasePath = isGithubPages ? `/${repository}` : ""

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  ...(isGithubPages
    ? {
      output: "export",
      basePath: pagesBasePath,
      assetPrefix: `${pagesBasePath}/`,
      trailingSlash: true,
    }
    : {}),
}

export default nextConfig
