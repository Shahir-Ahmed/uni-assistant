/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    '@whiskeysockets/baileys',
    '@hapi/boom',
    'ws',
    'pino',
    'pino-pretty',
    'thread-stream',
    'whatsapp-rust-bridge',
    'libsignal',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

module.exports = nextConfig
