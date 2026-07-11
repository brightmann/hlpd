const { withContentlayer } = require("next-contentlayer2");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: true /** Missing source maps for large first-party JavaScript */,
  // Contentlayer injects a webpack config; empty turbopack silences Next 16's mismatch error.
  turbopack: {},
  images: {
    formats: ["image/avif", "image/webp"],
    unoptimized: false,
    path: '/_next/image',
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  async headers() {
    return [
      {
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Content-Disposition',
            value: 'inline',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/static/images/(.*)',
        headers: [
          {
            key: 'Content-Disposition',
            value: 'inline',
          },
        ],
      },
    ];
  },
};

module.exports = withContentlayer(nextConfig);
