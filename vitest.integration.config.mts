import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Integration test: service + Prisma ke database test terpisah (lihat src/test/test-database.ts).
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.int.test.ts"],
    globalSetup: ["src/test/integration-global-setup.ts"],
    setupFiles: ["src/test/integration-setup.ts"],
    // Satu database bersama: file test dijalankan berurutan.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
