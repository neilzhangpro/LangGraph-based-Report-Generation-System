/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',  // 启用独立输出模式
  eslint: {
    // 如果你想在生产构建时忽略 ESLint 错误
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 如果你想在生产构建时忽略 TypeScript 错误
    ignoreBuildErrors: true,
  },
  experimental: {
    outputFileTracingRoot: undefined, // 用于正确处理依赖
  },
  // 配置 CORS
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*', // 在生产环境中应该设置为具体的域名
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-Requested-With,Content-Type,Authorization',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;