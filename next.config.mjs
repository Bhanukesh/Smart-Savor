/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // The API routes have no other client-origin restriction today (no auth-derived allowlist
  // exists yet — see lib/data.ts's documented "no session exists" gaps), so this just lets
  // the mobile app (Expo dev server / expo start --web, a different origin) reach them the
  // same way the same-origin Next.js pages already do.
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ];
  },
};

export default nextConfig;
