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
