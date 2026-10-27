import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Self-contained server bundle for the Docker image.
  output: "standalone",
  // The workspace root holds node_modules/.pnpm; tracing must start there for standalone output.
  experimental: { outputFileTracingRoot: path.join(here, "..") },
  transpilePackages: ["@skrp/shared"],
  poweredByHeader: false,
};
export default nextConfig;
