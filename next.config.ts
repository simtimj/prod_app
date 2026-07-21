import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    const fastApiBaseUrl = (process.env.FASTAPI_BASE_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
    return [
      {
        source: "/api/parse-task",
        destination: `${fastApiBaseUrl}/parse-task`,
      },
      {
        source: "/api/tasks",
        destination: `${fastApiBaseUrl}/tasks`,
      },
      {
        source: "/api/tasks/:path*",
        destination: `${fastApiBaseUrl}/tasks/:path*`,
      },
    ];
  },
};

export default nextConfig;
