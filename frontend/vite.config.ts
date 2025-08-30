import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: "debug-file-saver",
      configureServer(server) {
        server.middlewares.use("/api/debug/save", async (req, res, next) => {
          if (req.method !== "POST") {
            return next();
          }

          try {
            let body = "";
            req.on("data", (chunk) => {
              body += chunk.toString();
            });

            req.on("end", async () => {
              try {
                const { filename, data, sessionId } = JSON.parse(body);

                // Save to the project root directory
                const projectRoot = path.resolve(__dirname, "..");
                const debugDir = path.join(projectRoot, "debug-logs");

                // Create debug-logs directory if it doesn't exist
                if (!fs.existsSync(debugDir)) {
                  fs.mkdirSync(debugDir, { recursive: true });
                }

                const filePath = path.join(debugDir, filename);
                fs.writeFileSync(filePath, data, "utf8");

                console.log(`🐛 Debug session saved: ${filePath}`);

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    success: true,
                    filePath,
                    sessionId,
                  })
                );
              } catch (parseError) {
                console.error(
                  "Failed to parse debug save request:",
                  parseError
                );
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    success: false,
                    error: "Invalid request data",
                  })
                );
              }
            });
          } catch (error) {
            console.error("Debug save middleware error:", error);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                success: false,
                error: "Internal server error",
              })
            );
          }
        });
      },
    },
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
    },
    port: 5173,
    host: true,
  },
  build: {
    sourcemap: true,
  },
});
