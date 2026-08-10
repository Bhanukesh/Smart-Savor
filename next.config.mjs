/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Dev-only: lets `expo start --web` (a different localhost port, so a different browser
  // origin) reach the Next dev server, same as the same-origin web pages already can. A
  // compiled native app (the actual production APK) isn't a browser and was never subject to
  // CORS in the first place — production has no legitimate cross-origin browser caller for
  // this API, so no CORS headers ship there. This used to be `Access-Control-Allow-Origin: *`
  // on every environment, which meant any website's JS could call these endpoints directly.
  async headers() {
    if (process.env.NODE_ENV === 'production') return [];
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'http://localhost:8081' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ];
  },
};

export default nextConfig;
