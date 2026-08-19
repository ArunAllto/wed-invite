import { defineConfig } from "vite";

// The site is served from the domain root on Netlify, so the default base of
// "/" is correct. This previously switched on a GITHUB_PAGES flag, because
// GitHub Pages served the site from a /<repo>/ subpath; that deploy has been
// retired in favour of Netlify, which also hosts the wishes form's
// serverless function.
export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        quietDeps: true,
      },
    },
  },
});
