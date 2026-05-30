/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable instrumentation hook for DB auto-init on startup
  experimental: {
    instrumentationHook: true,
    // pdfkit uses Node.js native modules — mark as server-only external
    serverComponentsExternalPackages: ['pdfkit'],
    // Allow fonts directory to be read at runtime on Vercel
    outputFileTracingIncludes: {
      '/api/papers/[id]/pdf': ['./fonts/**'],
    },
  },
}

export default nextConfig
