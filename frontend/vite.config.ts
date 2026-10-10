import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Load .env so we can use VITE_BACKEND_ORIGIN in the proxy config
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const backendOrigin = env.VITE_BACKEND_ORIGIN || "http://127.0.0.1:8000";

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target: backendOrigin,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on("error", (err, _req, res) => {
              if (res && "writeHead" in res && !res.headersSent) {
                res.writeHead(503, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Backend not available", details: err.message }));
              }
            });
          },
        },
      },
    },
  };
});
