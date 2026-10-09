import type { NextConfig } from "next";

// SVGs under assets/icons are imported as React components (same setup as the
// prepex student app), so a single glyph can be recoloured with `currentColor`
// and sized with Tailwind classes instead of shipping a fixed-colour image.
const svgrOptions = {
  svgoConfig: {
    plugins: [
      {
        name: "preset-default",
        params: { overrides: { removeViewBox: false } },
      },
    ],
  },
};

// Next doesn't re-export webpack's own types, so the handful of rule fields
// this config touches are declared here rather than pulled in from webpack.
type SvgRule = {
  test?: RegExp;
  issuer?: unknown;
  resourceQuery?: RegExp | { not?: unknown[] };
  exclude?: RegExp;
  use?: unknown;
};

type WebpackConfig = {
  module: { rules: SvgRule[] };
};

const nextConfig: NextConfig = {
  // Self-contained server for the Docker image (see Dockerfile).
  output: "standalone",
  // Student profiles moved under Users; keep old links working.
  async redirects() {
    return [{ source: "/students/:id", destination: "/users/:id", permanent: true }];
  },
  turbopack: {
    rules: {
      "*.svg": {
        loaders: [
          {
            loader: "@svgr/webpack",
            options: svgrOptions,
          },
        ],
        as: "*.js",
      },
    },
  },
  // Turbopack (the default in Next 16) uses the `turbopack.rules` above; this
  // is the equivalent for a `--webpack` build.
  webpack(config: WebpackConfig) {
    const fileLoaderRule = config.module.rules.find((rule) =>
      rule?.test?.test?.(".svg"),
    );
    if (!fileLoaderRule) return config;

    config.module.rules.push(
      {
        ...fileLoaderRule,
        test: /\.svg$/i,
        resourceQuery: /url/,
      },
      {
        test: /\.svg$/i,
        issuer: fileLoaderRule.issuer,
        resourceQuery: {
          // Everything except `?url`, which the rule above keeps as a plain
          // file import.
          not: [
            ...(fileLoaderRule.resourceQuery instanceof RegExp
              ? []
              : (fileLoaderRule.resourceQuery?.not ?? [])),
            /url/,
          ],
        },
        use: [{ loader: "@svgr/webpack", options: svgrOptions }],
      },
    );

    fileLoaderRule.exclude = /\.svg$/i;

    return config;
  },
};

export default nextConfig;
