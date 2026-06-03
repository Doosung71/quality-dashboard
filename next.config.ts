import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/pdf-parse/dist/pdf-parse/cjs/pdf.worker.mjs",
    ],
  },
  images: {
    // Node.js v25+ 환경에서 sharp 바인딩 비호환 이슈 우회
    unoptimized: true,
  },
};

export default nextConfig;
