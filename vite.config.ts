import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/run/" : "/",
  appType: "mpa",
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        "case-study": fileURLToPath(
          new URL("./case-study/index.html", import.meta.url),
        ),
      },
    },
  },
}));
