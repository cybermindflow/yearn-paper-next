/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable instrumentation hook for DB auto-init on startup
  experimental: {
    instrumentationHook: true,
    // puppeteer-core and @sparticuz/chromium use Node.js native modules — mark as server-only external
    serverComponentsExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
  },
}

export default nextConfig
