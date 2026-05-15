import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Образ Docker: один server.js + static (меньше размер на Amvera/VPS)
  output: "standalone",
  // Prisma: не вшивать клиент в бандл целиком (лучшая совместимость с dev/Turbopack)
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
