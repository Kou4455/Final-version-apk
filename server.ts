import express from "express";
import http from "http";
import path from "path";
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
import {
  calculateAuthoritativeFare,
  setDriverOnlineStatusAuthoritative,
  syncDriverRecord,
  getOrCreateVehicle,
  createRideRequestAuthoritative,
  driverAcceptRideAuthoritative,
  expireRideAuthoritative,
  driverArrivedAuthoritative,
  driverStartRideAuthoritative,
  driverCompleteRideAuthoritative,
  settleRidePaymentAuthoritative,
  cancelRideAuthoritative,
  submitAuthoritativeRating,
  requestDriverWithdrawalAuthoritative,
  processWithdrawalAuthoritative,
  createSupportTicketAuthoritative,
  updateSupportTicketAuthoritative,
  getAdminOperationsSummary,
  getEngineState,
  updateSystemConfigAuthoritative,
  getDriverApprovalsAuthoritative,
  createDriverApprovalAuthoritative,
  approveDriverRegistrationAuthoritative,
  rejectDriverRegistrationAuthoritative,
  deleteDriverApprovalAuthoritative,
  getAllDriversAuthoritative
} from "./server/businessEngine";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = http.createServer(app);

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

  // ==============================================================================
  // AUTHORITATIVE TOTO DRIVE BUSINESS ENGINE APIS
  // ==============================================================================

  // 1. Authoritative Fare Estimation API
  app.post("/api/fare/calculate", (req, res) => {
    try {
      const { vehicleType, distanceKm, estimatedDurationMins, waitingMinutes, promoCode } = req.body || {};
      if (typeof distanceKm !== 'number') {
        res.status(400).json({ error: "distanceKm is required." });
        return;
      }
      const fare = calculateAuthoritativeFare({
        vehicleType: vehicleType || 'toto',
        distanceKm,
        estimatedDurationMins,
        waitingMinutes,
        promoCode
      });
      res.json({ success: true, fare });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to calculate fare." });
    }
  });

  // 2. Authoritative Ride Booking & Matching Dispatch API
  app.post("/api/rides/request", (req, res) => {
    try {
      const { userId, userName, userPhone, pickup, dropoff, vehicleType, paymentMethod, promoCode, targetDriverId } = req.body || {};
      if (!userId || !pickup || !dropoff) {
        res.status(400).json({ error: "Missing required ride booking parameters." });
        return;
      }
      const result = createRideRequestAuthoritative({
        userId,
        userName: userName || 'Passenger',
        userPhone: userPhone || '',
        pickup,
        dropoff,
        vehicleType: vehicleType || 'toto',
        paymentMethod: paymentMethod || 'cash',
        promoCode,
        targetDriverId
      });
      res.status(201).json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Ride request rejected by business engine." });
    }
  });

  // 3. Active Ride Recovery (App restart recovery)
  app.get("/api/rides/active", (req, res) => {
    try {
      const { userId, driverId } = req.query;
      const state = getEngineState();
      const allRides = Object.values(state.rides);

      let active: any = null;
      if (userId) {
        active = allRides.find(r => r.userId === userId && r.status !== 'CLOSED' && r.status !== 'CUSTOMER_CANCELLED' && r.status !== 'DRIVER_CANCELLED');
      } else if (driverId) {
        active = allRides.find(r => r.driverId === driverId && r.status !== 'CLOSED' && r.status !== 'CUSTOMER_CANCELLED' && r.status !== 'DRIVER_CANCELLED');
      }

      res.json({ success: true, activeRide: active || null });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch active ride." });
    }
  });

  // 4. Atomic Ride Acceptance by Driver
  app.post("/api/rides/:id/accept", (req, res) => {
    try {
      const rideId = req.params.id;
      const { driverId } = req.body || {};
      if (!driverId) {
        res.status(400).json({ error: "driverId is required to accept ride." });
        return;
      }
      const result = driverAcceptRideAuthoritative(rideId, driverId);
      if (!result.success) {
        res.status(409).json(result);
        return;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to accept ride." });
    }
  });

  // 4b. Expire Ride When No Captain Accepts Within Expiration Window
  app.post("/api/rides/:id/expire", (req, res) => {
    try {
      const rideId = req.params.id;
      const result = expireRideAuthoritative(rideId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to expire ride." });
    }
  });

  // 5. Driver Arrived at Pickup
  app.post("/api/rides/:id/arrived", (req, res) => {
    try {
      const rideId = req.params.id;
      const { driverId, lat, lng } = req.body || {};
      if (!driverId) {
        res.status(400).json({ error: "driverId is required." });
        return;
      }
      const result = driverArrivedAuthoritative(rideId, driverId, lat, lng);
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to mark arrived." });
    }
  });

  // 6. Driver Start Ride with 4-Digit OTP Verification
  app.post("/api/rides/:id/start", (req, res) => {
    try {
      const rideId = req.params.id;
      const { driverId, otp } = req.body || {};
      if (!driverId || !otp) {
        res.status(400).json({ error: "driverId and 4-digit otp are required to start trip." });
        return;
      }
      const result = driverStartRideAuthoritative(rideId, driverId, otp);
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to start ride." });
    }
  });

  // 7. Driver Complete Ride & Generate Authoritative Invoice
  app.post("/api/rides/:id/complete", (req, res) => {
    try {
      const rideId = req.params.id;
      const { driverId, actualDistanceKm, actualDurationMins } = req.body || {};
      if (!driverId) {
        res.status(400).json({ error: "driverId is required." });
        return;
      }
      const result = driverCompleteRideAuthoritative(rideId, driverId, actualDistanceKm, actualDurationMins);
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to complete ride." });
    }
  });

  // 8. Payment Settlement
  app.post("/api/rides/:id/pay", (req, res) => {
    try {
      const rideId = req.params.id;
      const { paymentMethod } = req.body || {};
      const result = settleRidePaymentAuthoritative(rideId, paymentMethod || 'cash');
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to confirm payment." });
    }
  });

  // 9. Cancel Ride Authoritative
  app.post("/api/rides/:id/cancel", (req, res) => {
    try {
      const rideId = req.params.id;
      const { actor, reason } = req.body || {};
      const result = cancelRideAuthoritative(rideId, actor || 'customer', reason);
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to cancel ride." });
    }
  });

  // 10. Driver Toggle Online / Offline with Full Validation
  app.post("/api/drivers/:id/toggle-online", (req, res) => {
    try {
      const driverId = req.params.id;
      const { online, lat, lng } = req.body || {};
      const result = setDriverOnlineStatusAuthoritative(driverId, Boolean(online), lat, lng);
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to toggle driver status." });
    }
  });

  // 11. Sync Driver Profile Record
  app.post("/api/drivers/sync", (req, res) => {
    try {
      const driverData = req.body;
      if (!driverData || !driverData.id || !driverData.name) {
        res.status(400).json({ error: "Valid driver record with id and name required." });
        return;
      }
      const synced = syncDriverRecord(driverData);
      const vehicle = getOrCreateVehicle(driverData.id, driverData.vehicle);
      res.json({ success: true, driver: synced, vehicle });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to sync driver." });
    }
  });

  // 12. Driver Transaction Ledger API
  app.get("/api/drivers/:id/ledger", (req, res) => {
    try {
      const driverId = req.params.id;
      const state = getEngineState();
      const entries = state.ledger.filter(l => l.driverId === driverId);
      const driver = state.drivers[driverId];
      res.json({
        success: true,
        balance: driver ? driver.walletBalance : 0,
        entries
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch ledger." });
    }
  });

  // 13. Driver Withdrawal Request API
  app.post("/api/drivers/:id/withdraw", (req, res) => {
    try {
      const driverId = req.params.id;
      const { amount, method, payoutDetails } = req.body || {};
      if (!amount || !method || !payoutDetails) {
        res.status(400).json({ error: "amount, method, and payoutDetails are required." });
        return;
      }
      const result = requestDriverWithdrawalAuthoritative(driverId, Number(amount), method, payoutDetails);
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to process withdrawal request." });
    }
  });

  // 14. Ratings Submission & Inspection API
  app.post("/api/ratings", (req, res) => {
    try {
      const { rideId, fromUserId, toUserId, fromRole, rating, comment } = req.body || {};
      if (!rideId || !fromUserId || !toUserId || !rating) {
        res.status(400).json({ error: "Missing required rating parameters." });
        return;
      }
      const result = submitAuthoritativeRating({
        rideId,
        fromUserId,
        toUserId,
        fromRole: fromRole || 'customer',
        rating: Number(rating),
        comment
      });
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to submit rating." });
    }
  });

  app.get("/api/ratings", (req, res) => {
    try {
      const state = getEngineState();
      res.json({ success: true, ratings: state.ratings });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 15. Coupon Validation API
  app.post("/api/coupons/validate", (req, res) => {
    try {
      const { code, fareAmount } = req.body || {};
      if (!code) {
        res.status(400).json({ error: "Coupon code is required." });
        return;
      }
      const state = getEngineState();
      const coupon = state.coupons[code.trim().toUpperCase()];
      if (!coupon || !coupon.isActive) {
        res.status(404).json({ valid: false, message: "Invalid or inactive promo code." });
        return;
      }
      if (new Date(coupon.expiryDate) < new Date()) {
        res.status(400).json({ valid: false, message: "Coupon has expired." });
        return;
      }
      if (fareAmount && fareAmount < coupon.minFare) {
        res.status(400).json({ valid: false, message: `Minimum ride fare for this coupon is ₹${coupon.minFare}.` });
        return;
      }

      let discount = coupon.discountType === 'percentage'
        ? Math.min(coupon.maxDiscount, Math.round(((fareAmount || 50) * coupon.discountValue) / 100))
        : Math.min(coupon.maxDiscount, coupon.discountValue);

      res.json({
        valid: true,
        code: coupon.code,
        discount,
        coupon
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 16. Support Tickets API
  app.get("/api/support/tickets", (req, res) => {
    try {
      const { userId } = req.query;
      const state = getEngineState();
      let list = state.supportTickets;
      if (userId) {
        list = list.filter(t => t.userId === userId);
      }
      res.json({ success: true, tickets: list });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/support/tickets", (req, res) => {
    try {
      const { userId, userName, userRole, rideId, category, subject, description, priority } = req.body || {};
      if (!userId || !subject || !description) {
        res.status(400).json({ error: "userId, subject, and description are required." });
        return;
      }
      const ticket = createSupportTicketAuthoritative({
        userId,
        userName: userName || 'User',
        userRole: userRole || 'user',
        rideId,
        category: category || 'other',
        subject,
        description,
        priority
      });
      res.status(201).json({ success: true, ticket });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/support/tickets/:id", requireAdminAuth, (req, res) => {
    try {
      const ticketId = req.params.id;
      const updates = req.body;
      const result = updateSupportTicketAuthoritative(ticketId, updates);
      if (!result.success) {
        res.status(404).json({ error: "Ticket not found." });
        return;
      }
      res.json({ success: true, ticket: result.ticket });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 17. Admin Operations Summary & KPIs
  app.get("/api/admin/operations-summary", requireAdminAuth, (req, res) => {
    try {
      const summary = getAdminOperationsSummary();
      res.json({ success: true, summary });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 18. Admin Pricing Controls API
  app.get("/api/admin/pricing", (req, res) => {
    try {
      const state = getEngineState();
      res.json({ success: true, pricing: state.systemConfig });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/pricing", requireAdminAuth, (req, res) => {
    try {
      const updated = updateSystemConfigAuthoritative(req.body);
      res.json({ success: true, pricing: updated, message: "System pricing and parameters updated." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 19. Admin Service Areas API
  app.get("/api/admin/service-areas", (req, res) => {
    try {
      const state = getEngineState();
      res.json({ success: true, serviceAreas: state.serviceAreas });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/service-areas", requireAdminAuth, (req, res) => {
    try {
      const state = getEngineState();
      const { name, city, centerLat, centerLng, radiusKm, isActive, description } = req.body || {};
      const newArea = {
        id: 'area_' + Date.now().toString(36),
        name: name || 'Operating Zone',
        city: city || 'Kolkata',
        centerLat: Number(centerLat),
        centerLng: Number(centerLng),
        radiusKm: Number(radiusKm) || 15,
        isActive: isActive !== false,
        description: description || ''
      };
      state.serviceAreas.push(newArea);
      res.status(201).json({ success: true, serviceArea: newArea });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 20. Admin Withdrawals & Payouts Processing
  app.get("/api/admin/withdrawals", requireAdminAuth, (req, res) => {
    try {
      const state = getEngineState();
      res.json({ success: true, withdrawals: state.withdrawals });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/withdrawals/:id/process", requireAdminAuth, (req, res) => {
    try {
      const id = req.params.id;
      const { action, notes } = req.body || {};
      const result = processWithdrawalAuthoritative(id, action === 'reject' ? 'reject' : 'approve', notes);
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 21. Admin Vehicles Management API
  app.get("/api/admin/vehicles", requireAdminAuth, (req, res) => {
    try {
      const state = getEngineState();
      res.json({ success: true, vehicles: Object.values(state.vehicles) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/admin/vehicles/:id/status", requireAdminAuth, (req, res) => {
    try {
      const vehicleId = req.params.id;
      const { status } = req.body || {};
      const state = getEngineState();
      const vehicle = state.vehicles[vehicleId];
      if (!vehicle) {
        res.status(404).json({ error: "Vehicle not found." });
        return;
      }
      vehicle.verification_status = status;
      vehicle.updated_at = new Date().toISOString();
      res.json({ success: true, vehicle, message: `Vehicle status updated to ${status}.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });


  // 22. Driver Approvals & Registration Management APIs
  app.get("/api/driver-approvals", (req, res) => {
    try {
      const approvals = getDriverApprovalsAuthoritative();
      res.json({ success: true, approvals });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to retrieve driver approvals." });
    }
  });

  app.post("/api/driver-approvals", (req, res) => {
    try {
      const payload = req.body || {};
      if (!payload.driverName || !payload.phone || !payload.vehicleNumber) {
        res.status(400).json({ error: "driverName, phone, and vehicleNumber are required." });
        return;
      }
      const result = createDriverApprovalAuthoritative(payload);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to submit driver registration." });
    }
  });

  app.post("/api/driver-approvals/:id/approve", (req, res) => {
    try {
      const approvalId = req.params.id;
      const { pin } = req.body || {};
      const result = approveDriverRegistrationAuthoritative(approvalId, pin);
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to approve driver." });
    }
  });

  app.post("/api/driver-approvals/:id/reject", (req, res) => {
    try {
      const approvalId = req.params.id;
      const { reason } = req.body || {};
      const result = rejectDriverRegistrationAuthoritative(approvalId, reason);
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to reject driver." });
    }
  });

  app.delete("/api/driver-approvals/:id", (req, res) => {
    try {
      const approvalId = req.params.id;
      const result = deleteDriverApprovalAuthoritative(approvalId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete driver approval." });
    }
  });

  // 23. Drivers List API
  app.get("/api/drivers", (req, res) => {
    try {
      const drivers = getAllDriversAuthoritative();
      res.json({ success: true, drivers });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to retrieve drivers." });
    }
  });

  // 24. PWA Webmanifest explicit routes for standard and role-specific manifests
  app.get(
    [
      "/manifest.webmanifest",
      "/manifest.json",
      "/manifest-customer.webmanifest",
      "/manifest-driver.webmanifest",
      "/manifest-admin.webmanifest"
    ],
    (req, res) => {
      const filename = req.path.replace(/^\//, "");
      const targetPath = path.join(process.cwd(), "public", filename);
      if (fs.existsSync(targetPath)) {
        res.setHeader("Content-Type", "application/manifest+json");
        res.sendFile(targetPath);
      } else {
        res.setHeader("Content-Type", "application/manifest+json");
        res.sendFile(path.join(process.cwd(), "public", "manifest-customer.webmanifest"));
      }
    }
  );

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
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: "spa",
    });
    // Intercept @vite/client in development to safely suppress container HMR websocket errors
    app.get("/@vite/client", async (req, res, next) => {
      try {
        const result = await vite.transformRequest("/@vite/client");
        if (result && result.code) {
          let code = result.code;
          code = code
            .replaceAll(/console\.error\(\s*`\[vite\][^`]*`\s*\);/g, "/* [vite] suppressed error */")
            .replace('error: (err) => console.error("[vite]", err)', "error: (err) => {}")
            .replace("throw e;", "return;");
          res.setHeader("Content-Type", "application/javascript");
          return res.send(code);
        }
      } catch (err) {
        // Fall back to vite middleware
      }
      next();
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

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
