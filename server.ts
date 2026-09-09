import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import {
  adminExists,
  createInitialAdmin,
  authenticateAdmin,
  validateSessionToken,
  invalidateSession,
  invalidateAllSessions,
  changeAdminUsername,
  changeAdminPassword,
  getAdminSecurityInfo,
  getAdminSafe,
  logSecurityActivity
} from "./server/adminAuth";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Helper to extract client IP
  const getClientIp = (req: express.Request): string => {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || '127.0.0.1';
  };

  // Helper middleware to authenticate admin session
  const requireAdminAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    const sessionCheck = validateSessionToken(token);

    if (!sessionCheck.valid) {
      logSecurityActivity('Unauthorized Admin API Request Rejected', getClientIp(req), false, req.path);
      res.status(401).json({ error: "Unauthorized access.", authenticated: false });
      return;
    }

    (req as any).admin = sessionCheck.admin;
    (req as any).adminToken = token;
    next();
  };

  // API Health check route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ==========================================
  // ADMIN AUTHENTICATION & SINGLE ACCOUNT APIS
  // ==========================================

  // 1. Check if admin account exists
  app.get("/api/admin/status", (req, res) => {
    const exists = adminExists();
    res.json({
      admin_exists: exists,
      initialized: exists,
      admin_count: exists ? 1 : 0
    });
  });

  // 2. Initial Admin Setup (Allowed ONLY when admin_count == 0)
  app.post("/api/admin/setup", (req, res) => {
    const ip = getClientIp(req);
    
    // STRICT ENFORCEMENT: Reject if admin already exists
    if (adminExists()) {
      res.status(403).json({
        error: "Admin account already exists. Registration is disabled.",
        code: "ADMIN_ALREADY_EXISTS"
      });
      return;
    }

    const { username, password, confirmPassword } = req.body || {};

    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required." });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).json({ error: "Password and Confirm Password do not match." });
      return;
    }

    try {
      const result = createInitialAdmin(username, password, ip);
      if (!result.success) {
        res.status(400).json({ error: result.message });
        return;
      }
      res.status(201).json({
        success: true,
        message: "Administrator account created successfully. Admin setup is now permanently closed.",
        admin_id: "ADMIN_001",
        admin: result.admin
      });
    } catch (err: any) {
      res.status(403).json({
        error: err.message || "Admin registration is not permitted.",
        code: "ADMIN_CREATION_FAILED"
      });
    }
  });

  // 3. Reject any standard registration or duplicate creation attempts
  app.all(["/api/admin/register", "/admin/register"], (req, res) => {
    const ip = getClientIp(req);
    logSecurityActivity('Direct Registration Endpoint Accessed & Blocked', ip, false, req.originalUrl);
    
    if (adminExists()) {
      if (req.method === 'GET') {
        res.status(403).send(`<!DOCTYPE html>
<html>
  <head><title>Admin Registration Disabled</title><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #FAF8F5; color: #111; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
    <div style="background: white; border: 1px solid #EDE8E0; border-radius: 20px; padding: 32px; max-width: 420px; text-align: center; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
      <div style="width: 48px; height: 48px; border-radius: 50%; background: #FDE8DC; color: #C8622A; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-weight: bold; font-size: 20px;">!</div>
      <h2 style="margin: 0 0 8px; font-size: 18px;">Admin Registration Disabled</h2>
      <p style="color: #666; font-size: 13px; line-height: 1.5; margin: 0 0 20px;">Admin account already exists. Registration is disabled.</p>
      <a href="/" style="display: inline-block; padding: 10px 20px; background: #181818; color: white; border-radius: 12px; text-decoration: none; font-size: 13px; font-weight: 600;">Return to Application</a>
    </div>
  </body>
</html>`);
        return;
      }
      res.status(403).json({
        error: "Admin account already exists. Registration is disabled.",
        code: "REGISTRATION_DISABLED"
      });
      return;
    }
    res.redirect("/");
  });

  // 4. Admin Login with rate limiting and constant-time password verification
  app.post("/api/admin/login", (req, res) => {
    const ip = getClientIp(req);
    const { username, password } = req.body || {};

    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required." });
      return;
    }

    const authResult = authenticateAdmin(username, password, ip);
    if (!authResult.success) {
      // Return 429 if rate-limited, otherwise 401 generic
      const isRateLimit = authResult.error?.includes('Too many failed');
      res.status(isRateLimit ? 429 : 401).json({
        error: authResult.error || "Invalid username or password."
      });
      return;
    }

    res.json({
      success: true,
      message: "Admin authenticated successfully",
      token: authResult.token,
      admin: getAdminSafe()
    });
  });

  // 5. Verify Active Admin Session
  app.get("/api/admin/verify-session", requireAdminAuth, (req, res) => {
    res.json({
      authenticated: true,
      admin: (req as any).admin
    });
  });

  // 6. Change Admin Username (Maintains SAME single admin_id ADMIN_001)
  app.post("/api/admin/change-username", requireAdminAuth, (req, res) => {
    const ip = getClientIp(req);
    const { currentPassword, newUsername } = req.body || {};

    if (!currentPassword || !newUsername) {
      res.status(400).json({ error: "Current password and new username are required." });
      return;
    }

    const result = changeAdminUsername(currentPassword, newUsername, ip);
    if (!result.success) {
      res.status(400).json({ error: result.message });
      return;
    }

    res.json({
      success: true,
      message: result.message,
      admin: result.admin
    });
  });

  // 7. Change Admin Password (Maintains SAME single admin_id ADMIN_001, invalidates other sessions)
  app.post("/api/admin/change-password", requireAdminAuth, (req, res) => {
    const ip = getClientIp(req);
    const { currentPassword, newPassword, confirmPassword } = req.body || {};

    if (!currentPassword || !newPassword || !confirmPassword) {
      res.status(400).json({ error: "All password fields are required." });
      return;
    }

    const result = changeAdminPassword(currentPassword, newPassword, confirmPassword, ip);
    if (!result.success) {
      res.status(400).json({ error: result.message });
      return;
    }

    // After password change, issue fresh session token for this current requestor
    const currentToken = (req as any).adminToken;
    invalidateSession(currentToken);
    const newAuth = authenticateAdmin((req as any).admin.username, newPassword, ip);

    res.json({
      success: true,
      message: result.message,
      token: newAuth.token
    });
  });

  // 8. Single Session Logout
  app.post("/api/admin/logout", (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    invalidateSession(token);
    res.json({ success: true, message: "Logged out successfully." });
  });

  // 9. Logout ALL Sessions across all browsers/devices
  app.post("/api/admin/logout-all", requireAdminAuth, (req, res) => {
    const ip = getClientIp(req);
    invalidateAllSessions(ip);
    res.json({
      success: true,
      message: "All admin sessions have been terminated. Please re-authenticate."
    });
  });

  // 10. Admin Security Dashboard Info (Activity logs, active sessions count, dates)
  app.get("/api/admin/security-info", requireAdminAuth, (req, res) => {
    const info = getAdminSecurityInfo();
    res.json({
      success: true,
      securityInfo: info
    });
  });

  // OAuth Callback Handler for Supabase / Google OAuth (Popup communication)
  app.get(["/auth/callback", "/auth/callback/"], (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Authenticating with Toto Drive...</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #FAF8F5;
        color: #111111;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        margin: 0;
      }
      .card {
        background: #ffffff;
        border: 1px solid #EDE8E0;
        border-radius: 16px;
        padding: 24px 32px;
        text-align: center;
        max-width: 340px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.06);
      }
      .spinner {
        width: 30px;
        height: 30px;
        border: 3px solid #EDE8E0;
        border-top-color: #E07A00;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        margin: 0 auto 12px;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="spinner"></div>
      <h3 style="margin: 0 0 6px; font-size: 15px; font-weight: 700;">Authenticating...</h3>
      <p style="margin: 0; font-size: 12px; color: #666;">Completing sign-in. This window will close automatically.</p>
    </div>
    <script>
      (function() {
        try {
          if (window.opener) {
            window.opener.postMessage({
              type: 'SUPABASE_AUTH_CALLBACK',
              hash: window.location.hash,
              search: window.location.search,
              href: window.location.href
            }, '*');
            setTimeout(function() {
              window.close();
            }, 300);
          } else {
            window.location.href = '/';
          }
        } catch (e) {
          window.location.href = '/';
        }
      })();
    </script>
  </body>
</html>`);
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
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.webmanifest')) {
          res.setHeader('Content-Type', 'application/manifest+json');
        }
      }
    }));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
