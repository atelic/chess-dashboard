import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable SharedArrayBuffer for Stockfish WASM multi-threading
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },
  
  // Empty turbopack config to silence the warning
  // (Turbopack handles WASM automatically)
  turbopack: {},
};

export default nextConfig;
