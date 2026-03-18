import express from "express";
import { createServer as createViteServer } from "vite";
import { initDb } from "./src/db";
import apiRoutes from "./src/routes/api";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize DB
  initDb();

  app.use(express.json());

  // Request logger for debugging
  app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
  });

  // Handle Chrome DevTools configuration requests
  app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
    res.json({});
  });

  // API Routes
  app.use("/api", apiRoutes);

  // Vite middleware for development
  const isDev = process.env.NODE_ENV !== "production";
  
  if (isDev) {
    console.log("Starting Vite in development mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom", // Use 'custom' to handle HTML serving manually
    });
    app.use(vite.middlewares);

    // Serve index.html as a fallback for all non-asset requests
    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;

      // If it's an API request or a file request (dot in URL), skip
      if (url.startsWith("/api") || (url.includes(".") && !url.endsWith(".html"))) {
        return next();
      }

      try {
        const templatePath = path.join(__dirname, "index.html");
        let template = fs.readFileSync(templatePath, "utf-8");
        
        // Transform the HTML through Vite
        template = await vite.transformIndexHtml(url, template);
        
        // Apply permissive CSP to prevent blocking of scripts/devtools
        res.status(200).set({ 
          "Content-Type": "text/html",
          "Content-Security-Policy": "default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src * 'unsafe-inline'; img-src * data:; style-src * 'unsafe-inline';" 
        }).end(template);
      } catch (e) {
        console.error("Vite transformation error:", e);
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    // Production serving from dist
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${isDev ? 'Development' : 'Production'}`);
  });
}

startServer();
