/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "lucide-react",
    "recharts",
    "date-fns",
    "clsx",
    "tailwind-merge",
    "@tanstack/react-table",
    "class-variance-authority",
  ],
  output: "export",
  images: {
    unoptimized: true,
  },
  modularizeImports: {
    "@radix-ui/react-*": {
      transform: "@radix-ui/react/{{member}}",
    },
    "lucide-react": {
      transform: "lucide-react/{{member}}",
    },
    "date-fns": {
      transform: "date-fns/{{member}}",
    },
  },
  experimental: {
    optimizePackageImports: [
      "@radix-ui/react-*",
      "@radix-ui/themes",
      "@tanstack/react-table",
      "recharts",
      "lucide-react",
      "date-fns",
    ],
  },
}

export default nextConfig
