import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "sharp"],
  // 같은 와이파이의 다른 기기(아이폰 등)에서 개발 서버에 접속할 수 있도록 허용
  allowedDevOrigins: ["192.168.45.236"],
};

export default nextConfig;
