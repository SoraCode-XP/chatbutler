/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@chatbutler/shared'],
};

module.exports = nextConfig;
