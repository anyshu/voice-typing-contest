import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  main: {
    build: {
      lib: {
        entry: "src/main/index.ts",
      },
    },
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    build: {
      lib: {
        entry: "src/main/preload.ts",
      },
    },
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    plugins: [vue()],
    server: {
      host: "127.0.0.1",
    },
  },
});
