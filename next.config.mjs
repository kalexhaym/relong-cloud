/** @type {import('next').NextConfig} */
let nextConfig = {};

if (process.env.NEXT_PUBLIC_APP_ENV === 'pages') {
    nextConfig = {
        basePath: '/relong-cloud',
        assetPrefix: '/relong-cloud/',
        output: 'export',
        distDir: 'build'
    };
}

export default nextConfig;
