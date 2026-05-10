import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  
  // Pi Network Auth Validation
  app.post("/api/auth", async (req, res) => {
    try {
      const { accessToken } = req.body;
      if (!accessToken) {
        return res.status(400).json({ error: "Access token is required" });
      }

      // Validate access token against Pi Network API
      const piResponse = await fetch("https://api.minepi.com/v2/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!piResponse.ok) {
        throw new Error("Invalid access token");
      }

      const userData = await piResponse.json();
      
      // Here you would typically establish a session, save to DB, etc.
      // For now, we return the validated user data to the frontend
      res.json({ 
        authenticated: true, 
        user: userData,
        sessionId: Math.random().toString(36).substring(7)
      });
    } catch (error: any) {
      console.error("Pi Auth Error:", error.message);
      res.status(401).json({ error: "Authentication failed" });
    }
  });

  // Mock PiRC Matrix API
  app.get("/api/pirc_matrix", (req, res) => {
    res.json({
      status: "success",
      data: [
        { id: "L1", layer: "Physical", nodeCount: 1560, health: "Optimal", volume: "1.2M", timestamp: Date.now() },
        { id: "L2", layer: "Data Link", nodeCount: 1300, health: "Good", volume: "800k", timestamp: Date.now() },
        { id: "L3", layer: "Network", nodeCount: 3000, health: "Optimal", volume: "3.5M", timestamp: Date.now() },
        { id: "L4", layer: "Transport", nodeCount: 2200, health: "Warning", volume: "4.1M", timestamp: Date.now() },
        { id: "L5", layer: "Session", nodeCount: 1000, health: "Optimal", volume: "1.5M", timestamp: Date.now() },
        { id: "L6", layer: "Presentation", nodeCount: 850, health: "Optimal", volume: "900k", timestamp: Date.now() },
        { id: "L7", layer: "Application", nodeCount: 4500, health: "Optimal", volume: "8.2M", timestamp: Date.now() },
      ]
    });
  });

  // Mock Contracts Registry
  app.get("/api/contracts", (req, res) => {
    res.json({
      status: "success",
      data: [
        { id: "C-001", name: "PiRC Vault Soroban", status: "Active", tvl: 4500000, audits: "Passed" },
        { id: "C-002", name: "Matrix Matrix Subscription", status: "Deploying", tvl: 0, audits: "Pending" },
        { id: "C-003", name: "RWA Real Estate Tokenizer", status: "Active", tvl: 12500000, audits: "Passed" },
      ]
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
