import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma: не вшивать клиент в бандл целиком (лучшая совместимость с dev/Turbopack)
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
