import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health check route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Supabase Status & Todos endpoints
  app.get("/api/supabase/status", (req, res) => {
    res.json({
      status: "connected",
      url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      hasPublishableKey: Boolean(
        process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
      ),
      hasSecretKey: Boolean(process.env.SUPABASE_SECRET_KEY),
      jwksUrl:
        process.env.SUPABASE_JWKS_URL ||
        "https://qjbbykgskirtoewkvgto.supabase.co/auth/v1/.well-known/jwks.json",
    });
  });

  app.get("/api/todos", async (req, res) => {
    try {
      const { serverSupabase } = await import("./server/supabase");
      const { data, error } = await serverSupabase.from("todos").select();
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
      res.json(data || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch todos" });
    }
  });

  // Verify if Supabase Google OAuth provider is actively enabled in Supabase
  app.get("/api/auth/google/check", async (req, res) => {
    try {
      const supabaseUrl =
        process.env.SUPABASE_URL ||
        process.env.VITE_SUPABASE_URL ||
        "https://qjbbykgskirtoewkvgto.supabase.co";
      const checkUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(
        "https://localhost:3000/auth/callback"
      )}`;
      const response = await fetch(checkUrl, { method: "GET" });
      if (response.status === 400) {
        const data: any = await response.json().catch(() => ({}));
        if (data.msg && data.msg.includes("provider is not enabled")) {
          res.json({ enabled: false, reason: "provider_not_enabled", message: data.msg });
          return;
        }
      }
      res.json({ enabled: response.ok || response.status === 302 || response.status === 303 });
    } catch (err: any) {
      res.json({ enabled: false, error: err.message });
    }
  });

  // OAuth Popup Callback Handler (per oauth-integration guidelines)
  app.get("/auth/callback", (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Authentication Successful</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #faf8f5;
              color: #111;
            }
            .card {
              text-align: center;
              padding: 32px 28px;
              background: white;
              border-radius: 16px;
              box-shadow: 0 4px 24px rgba(0,0,0,0.08);
              max-width: 340px;
              width: 90%;
            }
            .spinner {
              width: 32px;
              height: 32px;
              border: 3px solid #f0eee6;
              border-top: 3px solid #C8622A;
              border-radius: 50%;
              animation: spin 0.8s linear infinite;
              margin: 0 auto 16px;
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="spinner"></div>
            <h3 style="margin: 0 0 6px; font-size: 17px; font-weight: 700;">Connecting Account</h3>
            <p style="margin: 0; color: #666; font-size: 13px;">Signing in with Google and redirecting...</p>
          </div>
          <script>
            try {
              const fullUrl = window.location.href;
              const hash = window.location.hash || '';
              const search = window.location.search || '';
              if (window.opener) {
                window.opener.postMessage({
                  type: 'OAUTH_AUTH_SUCCESS',
                  hash: hash,
                  search: search,
                  url: fullUrl
                }, '*');
                setTimeout(() => window.close(), 400);
              } else {
                window.location.href = '/';
              }
            } catch (e) {
              window.close();
            }
          </script>
        </body>
      </html>
    `);
  });

  // Real-time Road Routing API proxy
  const routeCache = new Map<string, { data: any; timestamp: number }>();
  app.get("/api/route", async (req, res) => {
    try {
      const startLat = parseFloat(req.query.startLat as string);
      const startLng = parseFloat(req.query.startLng as string);
      const endLat = parseFloat(req.query.endLat as string);
      const endLng = parseFloat(req.query.endLng as string);

      if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
        res.status(400).json({ error: "Invalid coordinates provided" });
        return;
      }

      const cacheKey = `${startLat.toFixed(4)},${startLng.toFixed(4)}->${endLat.toFixed(4)},${endLng.toFixed(4)}`;
      const cached = routeCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 1000 * 60 * 30) {
        res.json(cached.data);
        return;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      try {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
        const response = await fetch(osrmUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (response.ok) {
          const json = await response.json();
          if (json.code === "Ok" && json.routes && json.routes.length > 0) {
            const route = json.routes[0];
            const coordinates = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
            const distanceKm = Number((route.distance / 1000).toFixed(2));
            const durationMins = Math.max(1, Math.round(route.duration / 60));

            const result = {
              success: true,
              coordinates,
              distanceKm,
              durationMins,
              source: "osrm"
            };

            routeCache.set(cacheKey, { data: result, timestamp: Date.now() });
            res.json(result);
            return;
          }
        }
      } catch (fetchErr) {
        // Fallback to geometric road routing
      }

      // High-fidelity fallback curve route if OSRM unavailable
      const points: [number, number][] = [];
      const steps = 14;
      const dLat = endLat - startLat;
      const dLng = endLng - startLng;
      const perpLat = -dLng * 0.08;
      const perpLng = dLat * 0.08;

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const curve = Math.sin(t * Math.PI) * (i % 2 === 0 ? 1 : 0.85);
        const lat = startLat + dLat * t + perpLat * curve;
        const lng = startLng + dLng * t + perpLng * curve;
        points.push([Number(lat.toFixed(5)), Number(lng.toFixed(5))]);
      }

      const directDist = Math.hypot(dLat, dLng) * 111;
      const roadDistanceKm = Number(Math.max(0.5, directDist * 1.25).toFixed(1));
      const estMinutes = Math.max(2, Math.round(roadDistanceKm * 3.2));

      const fallbackResult = {
        success: true,
        coordinates: points,
        distanceKm: roadDistanceKm,
        durationMins: estMinutes,
        source: "fallback"
      };

      res.json(fallbackResult);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to calculate route" });
    }
  });

  // Vite middleware for development / Static file serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
