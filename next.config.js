/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['nfxxwxvmzioanuksjcxp.supabase.co'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nfxxwxvmzioanuksjcxp.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

module.exports = nextConfig 