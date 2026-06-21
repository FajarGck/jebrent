import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Fix HMR WebSocket saat akses dari network IP (misal: dari HP/laptop lain)
  // Docs: https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
  allowedDevOrigins: ["192.168.145.1"],
};

export default nextConfig;
