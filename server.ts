import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Social Auto-Post
  app.post("/api/admin/auto-post", async (req, res) => {
    const { title, description, url, platforms } = req.body;
    
    console.log("Auto-posting to platforms:", platforms);
    console.log("Content:", { title, description, url });

    // In a real implementation, we would use platform-specific SDKs here
    // For now, we simulate success
    try {
      // Logic for Twitter (X), Pinterest, etc. would go here
      // Each platform needs its own API keys and OAuth tokens stored securely
      
      res.json({ 
        success: true, 
        message: "Simulated auto-post triggered for: " + platforms.join(", ") 
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to post to social media" });
    }
  });

  // Mock OAuth URL generator for demo
  app.get("/api/auth/social-url/:platform", (req, res) => {
    const { platform } = req.params;
    // Real URL would come from provider config
    const mockAuthUrl = `https://example.com/oauth/${platform}?client_id=mock&redirect_uri=${encodeURIComponent(process.env.APP_URL || '')}/auth/callback`;
    res.json({ url: mockAuthUrl });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
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
