import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    host: "127.0.0.1",
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    api: false,
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
