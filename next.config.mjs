/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Local Docker only (`DOCKER_BUILD=1` in Dockerfile.web).
  // Unset on Vercel so production deploy path stays unchanged.
  ...(process.env.DOCKER_BUILD === '1' ? { output: 'standalone' } : {}),
  // Prevent Next.js from trying to bundle native Node.js modules used in
  // Server Actions (PDF rendering via pdfjs-dist + @napi-rs/canvas).
  serverExternalPackages: [
    '@napi-rs/canvas',
    'pdfjs-dist',
    'canvas',
  ],
}

export default nextConfig
