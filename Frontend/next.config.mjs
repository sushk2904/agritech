const nextConfig = {
  reactStrictMode: true,
  experimental: {
    cpus: 1,
    parallelServerBuildTraces: false,
    parallelServerCompiles: false,
    webpackBuildWorker: false,
    workerThreads: true
  }
};

export default nextConfig;
