import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Скрыть плавающую кнопку «N» внизу при npm run dev (на проде её нет)
  devIndicators: false,
  // Образ Docker: один server.js + static (меньше размер на Amvera/VPS)
  output: "standalone",
  // Prisma: не вшивать клиент в бандл целиком (лучшая совместимость с dev/Turbopack)
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
