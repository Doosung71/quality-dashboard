import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/pdf-parse/dist/pdf-parse/cjs/pdf.worker.mjs",
    ],
  },
};

export default nextConfig;
