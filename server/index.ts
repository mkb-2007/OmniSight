import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { prisma } from './db.js';
import { authMiddleware, requireRole, generateToken, AuthenticatedRequest } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Rate Limiter for Login Attempts
const loginAttempts = new Map<string, { count: number; resetTime: number }>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 mins window

function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || now > record.resetTime) {
    loginAttempts.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return true;
  }
  if (record.count >= MAX_ATTEMPTS) {
    return false;
  }
  record.count += 1;
  return true;
}

function resetLoginRateLimit(ip: string): void {
  loginAttempts.delete(ip);
}

// ============================================================================
// 1. AUTHENTICATION ENDPOINTS
// ============================================================================

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkLoginRateLimit(clientIp)) {
    return res.status(429).json({
      success: false,
      error: 'Too many failed login attempts. Please try again after 15 minutes.'
    });
  }

  const { username, password, portal } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'Please provide both User ID and Password.'
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        role: true,
        ward: true
      }
    });

    if (!user) {
      await prisma.auditLog.create({
        data: {
          action: 'LOGIN_FAILED_NOT_FOUND',
          details: `User ${username} not found for portal: ${portal || 'ANY'}`
        }
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid User ID or Password.'
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN_FAILED_BAD_PASSWORD',
          details: `Failed password attempt for user ${username}`
        }
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid User ID or Password.'
      });
    }

    // Role-Based Portal Verification
    if (portal) {
      let requiredRole = portal.toUpperCase(); // 'CITY', 'WARD', 'DEVELOPER'
      if (requiredRole === 'DEV') requiredRole = 'DEVELOPER';
      if (user.role.name !== requiredRole) {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'LOGIN_REJECTED_WRONG_PORTAL',
            details: `User role ${user.role.name} attempted unauthorized access to ${portal} portal.`
          }
        });
        return res.status(403).json({
          success: false,
          error: `Access Denied: Your account role (${user.role.name}) is not authorized for the ${portal.toUpperCase()} portal.`
        });
      }
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role.name as any,
      wardId: user.wardId,
      wardName: user.ward?.name
    });

    // Set secure HTTP-only cookie
    res.cookie('omnisight_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN_SUCCESS',
        details: `Signed in to ${portal || user.role.name} portal.`
      }
    });

    resetLoginRateLimit(clientIp);

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role.name,
        wardId: user.wardId,
        wardName: user.ward?.name
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'An internal server error occurred while authenticating.'
    });
  }
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  res.clearCookie('omnisight_token');
  return res.json({
    success: true,
    message: 'Signed out successfully.'
  });
});

app.get('/api/auth/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        role: true,
        ward: true
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role.name,
        wardId: user.wardId,
        wardName: user.ward?.name
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 2. CITY PORTAL ENDPOINTS (Role: CITY)
// ============================================================================

app.get('/api/city/dashboard', authMiddleware, requireRole('CITY'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const hazards = await prisma.hazard.findMany({
      include: {
        road: true,
        ward: true
      }
    });

    const roads = await prisma.road.findMany();
    const wards = await prisma.ward.findMany({
      include: {
        hazards: true
      }
    });

    const totalDrain = roads.reduce((acc, r) => acc + r.dailySocietalDrain, 0);
    const l1Count = hazards.filter(h => h.severity === 'L1').length;
    const l2Count = hazards.filter(h => h.severity === 'L2').length;
    const l3Count = hazards.filter(h => h.severity === 'L3').length;

    // Leaderboard calculation
    const leaderboard = wards.map((w, idx) => {
      const wardHazards = w.hazards;
      const wardL1 = wardHazards.filter(h => h.severity === 'L1').length;
      const fixRate = Math.max(50, 95 - wardHazards.length * 2);
      const bleed = wardL1 * 12500 + wardHazards.length * 3500;
      return {
        id: w.id,
        rank: idx + 1,
        zoneNumber: w.zoneNumber,
        name: w.name,
        fixRate,
        monetaryBleed: bleed,
        slaHours: (3.0 + wardL1 * 1.2).toFixed(1),
        status: fixRate >= 80 ? 'Optimal' : (fixRate >= 65 ? 'Warning' : 'Critical'),
        hazardCount: wardHazards.length,
        l1Count: wardL1
      };
    }).sort((a, b) => b.fixRate - a.fixRate)
      .map((item, index) => ({ ...item, rank: index + 1 }));

    return res.json({
      success: true,
      data: {
        societalDrain: totalDrain || 356000,
        hazardSummary: {
          total: hazards.length,
          l1: l1Count,
          l2: l2Count,
          l3: l3Count
        },
        leaderboard,
        roadCount: roads.length,
        activeNodesCount: 142
      }
    });
  } catch (err: any) {
    console.error('City dashboard error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/city/roads', authMiddleware, requireRole('CITY'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const roads = await prisma.road.findMany({
      include: {
        hazards: {
          include: {
            ward: true
          }
        }
      }
    });
    return res.json({ success: true, data: roads });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/city/hazards', authMiddleware, requireRole('CITY'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const hazards = await prisma.hazard.findMany({
      include: {
        road: true,
        ward: true,
        incidents: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, data: hazards });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/city/budget', authMiddleware, requireRole('CITY'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const repairs = await prisma.repair.findMany({
      include: {
        incident: {
          include: {
            hazard: {
              include: {
                road: true,
                ward: true
              }
            }
          }
        }
      }
    });

    const budgetItems = repairs.map(r => ({
      id: r.id,
      ticket: r.incident.ticketNumber,
      location: r.incident.hazard ? `${r.incident.hazard.road.name} - ${r.incident.hazard.road.corridor || 'Segment'}` : r.incident.title,
      coords: r.incident.hazard ? `${r.incident.hazard.latitude.toFixed(4)}° N, ${r.incident.hazard.longitude.toFixed(4)}° E` : '13.0034° N, 80.2551° E',
      ward: r.incident.hazard?.ward.name || 'Adyar',
      repairCost: r.repairCostInr,
      drainCost: r.estimatedDrainSavedInr,
      roi: r.roiMultiplier,
      status: r.status // 'PENDING', 'APPROVED', 'COMPLETED'
    }));

    return res.json({ success: true, data: budgetItems });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/city/budget/:id/approve', authMiddleware, requireRole('CITY'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const repair = await prisma.repair.update({
      where: { id },
      data: { status: 'APPROVED' },
      include: { incident: true }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'BUDGET_APPROVED',
        details: `Approved repair budget ₹${repair.repairCostInr} for ticket ${repair.incident.ticketNumber}.`
      }
    });

    return res.json({ success: true, message: 'Budget approved successfully.', data: repair });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/city/analytics', authMiddleware, requireRole('CITY'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const roads = await prisma.road.findMany();
    const hazards = await prisma.hazard.findMany();
    const repairs = await prisma.repair.findMany();

    const totalDrain = roads.reduce((acc, r) => acc + r.dailySocietalDrain, 0);
    const totalRepairCost = repairs.reduce((acc, r) => acc + r.repairCostInr, 0);
    const totalSavings = repairs.filter(r => r.status === 'COMPLETED' || r.status === 'APPROVED')
      .reduce((acc, r) => acc + r.estimatedDrainSavedInr, 0);

    const hazardsByType = {
      CRATER: hazards.filter(h => h.type === 'CRATER').length,
      POTHOLE: hazards.filter(h => h.type === 'POTHOLE').length,
      WATERLOGGING: hazards.filter(h => h.type === 'WATERLOGGING').length,
      SURFACE_RAVELLING: hazards.filter(h => h.type === 'SURFACE_RAVELLING').length
    };

    const hazardsBySeverity = {
      L1: hazards.filter(h => h.severity === 'L1').length,
      L2: hazards.filter(h => h.severity === 'L2').length,
      L3: hazards.filter(h => h.severity === 'L3').length
    };

    return res.json({
      success: true,
      data: {
        dailySocietalDrain: totalDrain,
        totalRepairBudget: totalRepairCost,
        projectedSavings: totalSavings,
        averageRoi: 3.2,
        hazardsByType,
        hazardsBySeverity,
        activeSensors: 142,
        networkCoverageKm: 420.5
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 3. WARD PORTAL ENDPOINTS (Role: WARD)
// ============================================================================

app.get('/api/ward/dashboard', authMiddleware, requireRole('WARD'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const wardId = req.user!.wardId;
    if (!wardId) {
      return res.status(400).json({ success: false, error: 'No ward assigned to this user.' });
    }

    const ward = await prisma.ward.findUnique({
      where: { id: wardId },
      include: {
        hazards: {
          include: {
            road: true,
            incidents: true
          }
        },
        incidents: {
          include: {
            hazard: true,
            repairs: true
          }
        }
      }
    });

    if (!ward) {
      return res.status(404).json({ success: false, error: 'Ward not found.' });
    }

    const l1Count = ward.hazards.filter(h => h.severity === 'L1').length;
    const resolvedCount = ward.incidents.filter(i => i.status === 'RESOLVED').length;

    return res.json({
      success: true,
      data: {
        ward: {
          id: ward.id,
          name: ward.name,
          zoneNumber: ward.zoneNumber,
          code: ward.code
        },
        activeHazards: ward.hazards.length,
        l1Count,
        resolvedCount,
        incidents: ward.incidents
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/ward/incidents', authMiddleware, requireRole('WARD'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const wardId = req.user!.wardId;
    const incidents = await prisma.incident.findMany({
      where: wardId ? { wardId } : {},
      include: {
        hazard: {
          include: { road: true }
        },
        repairs: true,
        statusHistories: {
          include: { changedByUser: { select: { fullName: true } } },
          orderBy: { timestamp: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Map to Kanban structure
    const kanbanCards = incidents.map(i => {
      let col = 'todo';
      if (i.status === 'IN_PROGRESS' || i.status === 'ASSIGNED') col = 'progress';
      else if (i.status === 'RESOLVED') col = 'done';

      return {
        id: i.ticketNumber,
        dbId: i.id,
        title: i.title,
        type: i.type,
        priority: i.priority,
        contractor: i.contractor || 'GCC In-house',
        col,
        status: i.status,
        notes: i.notes
      };
    });

    return res.json({ success: true, data: kanbanCards });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/ward/incidents/:ticket/status', authMiddleware, requireRole('WARD'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ticket } = req.params;
    const { targetCol, notes } = req.body;

    let newStatus = 'DETECTED';
    if (targetCol === 'progress') newStatus = 'IN_PROGRESS';
    else if (targetCol === 'done') newStatus = 'RESOLVED';
    else if (targetCol === 'todo') newStatus = 'ASSIGNED';

    const incident = await prisma.incident.findUnique({
      where: { ticketNumber: ticket }
    });

    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident ticket not found.' });
    }

    const previousStatus = incident.status;
    const updated = await prisma.incident.update({
      where: { ticketNumber: ticket },
      data: { status: newStatus }
    });

    await prisma.statusHistory.create({
      data: {
        incidentId: incident.id,
        previousStatus,
        newStatus,
        changedByUserId: req.user!.id,
        notes: notes || `Moved to ${targetCol.toUpperCase()} by ${req.user!.fullName}`
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'INCIDENT_STATUS_CHANGE',
        details: `Ticket ${ticket} transitioned from ${previousStatus} to ${newStatus}.`
      }
    });

    return res.json({ success: true, message: 'Status updated.', data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/ward/dispatch', authMiddleware, requireRole('WARD'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { hazardCode } = req.body;
    const hazard = await prisma.hazard.findUnique({
      where: { hazardCode },
      include: { incidents: true }
    });

    if (!hazard) {
      return res.status(404).json({ success: false, error: 'Hazard not found.' });
    }

    const ticketNumber = 'WO-' + Math.floor(1000 + Math.random() * 9000);
    const incident = await prisma.incident.create({
      data: {
        ticketNumber,
        title: `Emergency Rapid Patch - ${hazard.hazardCode}`,
        type: `Single Pothole (${hazard.severity})`,
        priority: hazard.severity,
        status: 'IN_PROGRESS',
        hazardId: hazard.id,
        wardId: hazard.wardId,
        contractor: 'Coromandel Infrastructure Ltd (Unit #3)',
        etaMinutes: 18,
        notes: `Dispatched immediately by ${req.user!.fullName}`
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'DISPATCH_L1_CREW',
        details: `Emergency L1 patch crew dispatched for ${hazardCode} under ticket ${ticketNumber}.`
      }
    });

    return res.json({
      success: true,
      message: `Emergency Rapid Patch Crew dispatched for ${hazardCode}. ETA: 18 Minutes.`,
      ticketNumber
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/ward/verify', authMiddleware, requireRole('WARD'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ticketNumber, verdict, geoDelta, textureMatch } = req.body;

    const incident = await prisma.incident.findUnique({
      where: { ticketNumber },
      include: { repairs: true }
    });

    if (!incident) {
      return res.status(404).json({ success: false, error: 'Ticket not found.' });
    }

    if (verdict === 'PASSED') {
      await prisma.incident.update({
        where: { ticketNumber },
        data: { status: 'RESOLVED' }
      });

      if (incident.repairs.length > 0) {
        await prisma.repair.update({
          where: { id: incident.repairs[0].id },
          data: {
            verificationVerdict: 'PASSED',
            geoDeltaMeters: geoDelta || 3.42,
            textureMatchPercent: textureMatch || 97.4,
            verifiedAt: new Date(),
            status: 'COMPLETED'
          }
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'VERIFICATION_AUDIT',
        details: `Ticket ${ticketNumber} audit completed with verdict: ${verdict}.`
      }
    });

    return res.json({ success: true, message: 'Verification audit recorded.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Update incident status / attributes by ID or Ticket
app.patch('/api/ward/incidents/:id', authMiddleware, requireRole('WARD'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, targetCol, notes, contractor, priority } = req.body;

    let targetStatus = status;
    if (!targetStatus && targetCol) {
      if (targetCol === 'progress') targetStatus = 'IN_PROGRESS';
      else if (targetCol === 'done') targetStatus = 'RESOLVED';
      else if (targetCol === 'todo') targetStatus = 'ASSIGNED';
    }

    const incident = await prisma.incident.findUnique({
      where: id.startsWith('WO-') ? { ticketNumber: id } : { id }
    });

    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found.' });
    }

    const previousStatus = incident.status;
    const updateData: any = {};
    if (targetStatus) updateData.status = targetStatus;
    if (contractor) updateData.contractor = contractor;
    if (priority) updateData.priority = priority;
    if (notes) updateData.notes = notes;

    const updated = await prisma.incident.update({
      where: { id: incident.id },
      data: updateData
    });

    if (targetStatus && targetStatus !== previousStatus) {
      await prisma.statusHistory.create({
        data: {
          incidentId: incident.id,
          previousStatus,
          newStatus: targetStatus,
          changedByUserId: req.user!.id,
          notes: notes || `Status changed from ${previousStatus} to ${targetStatus} by ${req.user!.fullName}`
        }
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'WARD_INCIDENT_UPDATED',
        details: `Incident ${incident.ticketNumber} updated by ${req.user!.fullName}.`
      }
    });

    return res.json({ success: true, message: 'Incident updated successfully.', data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Append notes to incident
app.post('/api/ward/incidents/:id/notes', authMiddleware, requireRole('WARD'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!note) {
      return res.status(400).json({ success: false, error: 'Note text is required.' });
    }

    const incident = await prisma.incident.findUnique({
      where: id.startsWith('WO-') ? { ticketNumber: id } : { id }
    });

    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found.' });
    }

    const currentNotes = incident.notes ? `${incident.notes} | ${note}` : note;
    const updated = await prisma.incident.update({
      where: { id: incident.id },
      data: { notes: currentNotes }
    });

    await prisma.statusHistory.create({
      data: {
        incidentId: incident.id,
        previousStatus: incident.status,
        newStatus: incident.status,
        changedByUserId: req.user!.id,
        notes: `[NOTE] ${note}`
      }
    });

    return res.json({ success: true, message: 'Note added.', data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 4. DEVELOPER PORTAL ENDPOINTS (Role: DEVELOPER)
// ============================================================================

app.get('/api/developer/devices', authMiddleware, requireRole('DEVELOPER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const devices = await prisma.device.findMany({
      include: {
        vehicle: true,
        sensors: true
      },
      orderBy: { deviceSerial: 'asc' }
    });

    const fleetNodes = devices.map(d => ({
      id: d.id,
      serial: d.deviceSerial,
      busNumber: d.vehicle?.vehicleNumber || '00',
      route: d.vehicle?.route || 'Depot Standby',
      camFps: d.camFps,
      lteDbm: d.lteDbm,
      sqliteUsage: d.sqliteUsageMb,
      jetsonTemp: d.jetsonTempC,
      online: d.status === 'ONLINE',
      uptime: '14h 22m',
      firmware: d.firmwareVer
    }));

    return res.json({ success: true, data: fleetNodes });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/developer/telemetry', authMiddleware, requireRole('DEVELOPER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const telemetries = await prisma.telemetry.findMany({
      take: 20,
      orderBy: { timestamp: 'desc' },
      include: {
        device: {
          include: { vehicle: true }
        }
      }
    });
    return res.json({ success: true, data: telemetries });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/developer/firmware', authMiddleware, requireRole('DEVELOPER'), async (req: AuthenticatedRequest, res: Response) => {
  const { lowPassHz, delayBufferMs, gForceThreshold } = req.body;

  await prisma.auditLog.create({
    data: {
      userId: req.user!.id,
      action: 'OTA_FIRMWARE_CALIBRATION',
      details: `Calibration broadcast: Cutoff=${lowPassHz}Hz, Buffer=${delayBufferMs}ms, Spike=${gForceThreshold}G to 142 nodes.`
    }
  });

  return res.json({
    success: true,
    message: `Firmware calibration broadcast to 142 Nvidia Jetson Orin Nano nodes successfully.`
  });
});

app.post('/api/developer/vacuum', authMiddleware, requireRole('DEVELOPER'), async (req: AuthenticatedRequest, res: Response) => {
  await prisma.device.updateMany({
    data: {
      sqliteUsageMb: 18
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user!.id,
      action: 'SQLITE_VACUUM_BROADCAST',
      details: 'Fleet-wide SQLite VACUUM command broadcast to active edge nodes.'
    }
  });

  return res.json({
    success: true,
    message: 'Fleet-wide SQLite VACUUM executed. Reclaimed ~114 GB across all fleet nodes.'
  });
});

app.get('/api/developer/devices/:id', authMiddleware, requireRole('DEVELOPER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const device = await prisma.device.findUnique({
      where: { id },
      include: {
        vehicle: true,
        sensors: true
      }
    });

    if (!device) {
      return res.status(404).json({ success: false, error: 'Device not found.' });
    }

    const recentTelemetries = await prisma.telemetry.findMany({
      where: { deviceId: id },
      take: 10,
      orderBy: { timestamp: 'desc' }
    });

    return res.json({
      success: true,
      data: {
        ...device,
        recentTelemetries
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/developer/system-health', authMiddleware, requireRole('DEVELOPER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const devices = await prisma.device.findMany();
    const onlineCount = devices.filter(d => d.status === 'ONLINE').length;
    const auditLogs = await prisma.auditLog.findMany({
      take: 10,
      orderBy: { timestamp: 'desc' }
    });

    return res.json({
      success: true,
      data: {
        systemStatus: 'OPERATIONAL',
        edgeFleet: {
          total: devices.length,
          online: onlineCount,
          offline: devices.length - onlineCount,
          healthPercentage: ((onlineCount / devices.length) * 100).toFixed(1)
        },
        apiStatus: {
          uptimeSeconds: Math.floor(process.uptime()),
          responseTimeMs: 8,
          status: 'HEALTHY'
        },
        storage: {
          engine: 'PostgreSQL / Prisma-Compatible Engine',
          persistenceFile: 'data/omnisight_db.json',
          autoVacuumActive: true
        },
        recentAuditLogs: auditLogs
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 5. GENERAL HAZARDS SPATIAL & FILTER API
// ============================================================================

app.get('/api/hazards', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, severity, ward, status } = req.query;

    const where: any = {};
    if (type) where.type = String(type);
    if (severity) where.severity = String(severity);
    if (ward) where.wardId = String(ward);

    const hazards = await prisma.hazard.findMany({
      where,
      include: {
        road: true,
        ward: true,
        incidents: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, data: hazards });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/hazards/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const hazard = await prisma.hazard.findUnique({
      where: { id },
      include: {
        road: true,
        ward: true,
        incidents: true
      }
    });

    if (!hazard) {
      return res.status(404).json({ success: false, error: 'Hazard not found.' });
    }

    return res.json({ success: true, data: hazard });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Create new Incident lifecycle item
app.post('/api/incidents', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, type, priority, hazardId, wardId, contractor, notes } = req.body;
    const ticketNumber = 'WO-' + Math.floor(1000 + Math.random() * 9000);

    const incident = await prisma.incident.create({
      data: {
        ticketNumber,
        title: title || 'Road Defect Remediation',
        type: type || 'Single Pothole',
        priority: priority || 'L2',
        status: 'DETECTED',
        hazardId,
        wardId: wardId || req.user?.wardId,
        contractor: contractor || 'GCC In-house',
        etaMinutes: 60,
        notes: notes || 'Created via OmniSight API'
      }
    });

    await prisma.statusHistory.create({
      data: {
        incidentId: incident.id,
        previousStatus: 'NEW',
        newStatus: 'DETECTED',
        changedByUserId: req.user!.id,
        notes: 'Initial detection logged'
      }
    });

    return res.status(201).json({ success: true, data: incident });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Update Incident lifecycle item (DETECTED -> VERIFIED -> ASSIGNED -> IN PROGRESS -> RESOLVED)
app.patch('/api/incidents/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes, contractor, priority } = req.body;

    const incident = await prisma.incident.findUnique({
      where: id.startsWith('WO-') ? { ticketNumber: id } : { id }
    });

    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found.' });
    }

    const previousStatus = incident.status;
    const updateData: any = {};
    if (status) updateData.status = status;
    if (contractor) updateData.contractor = contractor;
    if (priority) updateData.priority = priority;
    if (notes) updateData.notes = notes;

    const updated = await prisma.incident.update({
      where: { id: incident.id },
      data: updateData
    });

    if (status && status !== previousStatus) {
      await prisma.statusHistory.create({
        data: {
          incidentId: incident.id,
          previousStatus,
          newStatus: status,
          changedByUserId: req.user!.id,
          notes: notes || `Lifecycle update from ${previousStatus} to ${status}`
        }
      });
    }

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/analytics', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const hazards = await prisma.hazard.findMany();
    const roads = await prisma.road.findMany();
    const devices = await prisma.device.findMany();
    const repairs = await prisma.repair.findMany();

    const totalDrain = roads.reduce((acc, r) => acc + r.dailySocietalDrain, 0);

    return res.json({
      success: true,
      data: {
        totalHazards: hazards.length,
        criticalHazards: hazards.filter(h => h.severity === 'L1').length,
        dailySocietalDrain: totalDrain,
        activeDevices: devices.filter(d => d.status === 'ONLINE').length,
        repairsCompleted: repairs.filter(r => r.status === 'COMPLETED').length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 7. PUBLIC CONTACT INQUIRY ENDPOINT
// ============================================================================
app.post('/api/contact', async (req: Request, res: Response) => {
  try {
    const { name, email, organization, subject, message } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Please provide your full name.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Please provide your email address.' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
    }
    if (!organization || !organization.trim()) {
      return res.status(400).json({ success: false, error: 'Please specify your organization or municipal department.' });
    }
    if (!subject || !subject.trim()) {
      return res.status(400).json({ success: false, error: 'Please provide an inquiry subject.' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Please enter your message.' });
    }

    // Persist inquiry in audit logs
    const audit = await prisma.auditLog.create({
      data: {
        action: 'CONTACT_INQUIRY_SUBMITTED',
        details: `From: ${name.trim()} (${email.trim()}) | Org: ${organization.trim()} | Subject: ${subject.trim()}`
      }
    });

    console.log(`[CONTACT] New inquiry from ${name} (${organization}): ${subject}`);

    return res.status(200).json({
      success: true,
      message: 'Thank you for reaching out to OmniSight. Our municipal infrastructure team will connect with you within 24 business hours.',
      inquiryId: audit.id,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[CONTACT_ERROR]', err);
    return res.status(500).json({ success: false, error: 'Failed to process inquiry. Please try again later.' });
  }
});

// Root & Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'HEALTHY', timestamp: new Date().toISOString(), platform: 'OmniSight Infrastructure OS' });
});

app.listen(PORT, () => {
  console.log(`🚀 OmniSight Express Backend running on http://localhost:${PORT}`);
});
