import { defineConfig } from 'vite';

// Relative asset URLs, so the build works under the GitHub Pages subpath
// (https://ahamed.github.io/druti-ime/) and from any other folder.
export default defineConfig({
  base: './',
});
