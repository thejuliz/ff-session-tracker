import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import routes from "./routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use("/api", routes);
app.use("/ff/api", routes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});
app.get("/ff/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Serve built frontend static files (production only — when dist exists)
// Docker: __dirname = /app/src → ../frontend/dist = /app/frontend/dist
// Local:  __dirname = backend/src → ../../frontend/dist = project/frontend/dist
const frontendDist = fs.existsSync(path.join(__dirname, "../frontend/dist"))
  ? path.join(__dirname, "../frontend/dist")
  : path.join(__dirname, "../../frontend/dist");

if (fs.existsSync(frontendDist)) {
  // Serve at both /ff/ (raw proxy) and / (stripped prefix)
  app.use("/ff", express.static(frontendDist));
  app.use(express.static(frontendDist));

  // SPA fallback for both prefixes
  app.get(["/ff", "/ff/*", "*"], (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on port ${PORT}`);
});
