import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import rehypeCode from "./src/lib/rehype-code.mjs";
import rehypeTables from "./src/lib/rehype-tables.mjs";
import rehypeGlossary from "./src/lib/rehype-glossary.mjs";
import rehypeBase from "./src/lib/rehype-base.mjs";
import { GLOSSARY } from "./src/data/glossary.ts";

// Set SITE_BASE=/repo-name when deploying to a GitHub Pages project site.
const base = process.env.SITE_BASE || "/";

export default defineConfig({
  site: process.env.SITE_URL || "https://example.com",
  base,
  trailingSlash: "always",
  /* Keep caches inside the project folder (not node_modules), so separate
     copies of the project can build at the same time. */
  cacheDir: "./.cache/astro",
  vite: { cacheDir: "./.cache/vite", resolve: { preserveSymlinks: true } },
  build: { format: "directory" },
  markdown: {
    syntaxHighlight: false,
    rehypePlugins: [
      rehypeCode,
      rehypeTables,
      [rehypeBase, { base: base.replace(/\/$/, "") }],
      [rehypeGlossary, { terms: GLOSSARY, base: base.replace(/\/$/, "") }],
    ],
  },
  integrations: [mdx()],
  devToolbar: { enabled: false },
});
