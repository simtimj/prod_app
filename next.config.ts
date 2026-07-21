import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    const fastApiParseTaskUrl = process.env.FASTAPI_PARSE_TASK_URL ?? "http://127.0.0.1:8000/parse-task";
    return [
      {
        source: "/api/parse-task",
        destination: fastApiParseTaskUrl,
      },
    ];
  },
};

export default nextConfig;
