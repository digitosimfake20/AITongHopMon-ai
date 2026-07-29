/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Prevent Next.js from trying to bundle native Node.js modules used in
  // Server Actions (PDF rendering via pdfjs-dist + @napi-rs/canvas).
  serverExternalPackages: [
    '@napi-rs/canvas',
    'pdfjs-dist',
    'canvas',
  ],
}

export default nextConfig
