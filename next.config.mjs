import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  output: "standalone",
  reactStrictMode: true,
  allowedDevOrigins: ["devbox"],
  async redirects() {
    return [
      ...["infra", "projects", "cheat-sheet", "journal", "scratchpad"].map(
        (section) => ({
          source: `/${section}/:path*`,
          destination: `/docs/${section}/:path*`,
          permanent: true,
        }),
      ),
      {
        source: "/koukou/:path*",
        destination: "/docs/projects/koukou/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/docs/:path*.md",
        destination: "/llms.mdx/docs/:path*.md",
      },
      {
        source: "/docs/:path*.txt",
        destination: "/llms.mdx/docs/:path*.txt",
      },
    ];
  },
};

export default withMDX(config);
