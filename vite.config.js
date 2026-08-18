import { defineConfig } from "vite";

// GitHub Pages serves project sites from https://<user>.github.io/<repo>/,
// so every asset URL needs that repo-name prefix in production. Locally
// (`npm run dev`) Vite always serves from "/", so this only changes the
// production build.
export default defineConfig({
  base: process.env.GITHUB_PAGES ? "/wed-invite/" : "/",
  css: {
    preprocessorOptions: {
      scss: {
        quietDeps: true,
      },
    },
  },
});
