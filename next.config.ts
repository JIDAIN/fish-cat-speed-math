import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  // Keep file tracing inside this project when the Windows user directory has another lockfile.
  outputFileTracingRoot: process.cwd(),
};
export default nextConfig;
