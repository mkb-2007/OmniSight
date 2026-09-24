import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

let DB_FILE = path.resolve(process.cwd(), 'data', 'omnisight_db.json');

// Ensure data directory exists if running in writable local environment
try {
  const dataDir = path.dirname(DB_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
} catch (e: any) {
  // Read-only filesystem (e.g. Vercel Serverless Function)
}

// In serverless environments, redirect database storage to /tmp if available
if (process.env.VERCEL === '1' || process.env.NOW_REGION || process.env.AWS_LAMBDA_FUNCTION_NAME) {
  try {
    const tmpFile = path.resolve('/tmp', 'omnisight_db.json');
    if (!fs.existsSync(tmpFile) && fs.existsSync(DB_FILE)) {
      fs.copyFileSync(DB_FILE, tmpFile);
    }
    if (fs.existsSync(tmpFile)) {
      DB_FILE = tmpFile;
    }
  } catch (e: any) {
    // Keep DB_FILE as default, save will handle in-memory
  }
}

interface DatabaseSchema {
  roles: any[];
  cities: any[];
  wards: any[];
  users: any[];
  vehicles: any[];
  devices: any[];
  sensors: any[];
  roads: any[];
  hazards: any[];
  incidents: any[];
  telemetries: any[];
  repairs: any[];
  statusHistories: any[];
  auditLogs: any[];
}

function getInitialSeedData(): DatabaseSchema {
  const hash = bcrypt.hashSync('OmniSight@2026', 10);

  const roles = [
    { id: 'role-city', name: 'CITY', description: 'City Municipal Official' },
    { id: 'role-ward', name: 'WARD', description: 'Ward Infrastructure Engineer' },
    { id: 'role-dev', name: 'DEVELOPER', description: 'Edge-AI Systems Lead' }
  ];

  const cities = [
    { id: 'city-chennai', name: 'Greater Chennai Corporation', state: 'Tamil Nadu' }
  ];

  const wards = [
    { id: 'ward-13', zoneNumber: '13', name: 'Zone 13: Adyar', code: 'Z13-W172', cityId: 'city-chennai' },
    { id: 'ward-09', zoneNumber: '09', name: 'Zone 9: Teynampet', code: 'Z09-W118', cityId: 'city-chennai' },
    { id: 'ward-08', zoneNumber: '08', name: 'Zone 8: Anna Nagar', code: 'Z08-W104', cityId: 'city-chennai' },
    { id: 'ward-10', zoneNumber: '10', name: 'Zone 10: Kodambakkam', code: 'Z10-W132', cityId: 'city-chennai' },
    { id: 'ward-05', zoneNumber: '05', name: 'Zone 5: Royapuram', code: 'Z05-W052', cityId: 'city-chennai' },
    { id: 'ward-04', zoneNumber: '04', name: 'Zone 4: Tondiarpet', code: 'Z04-W039', cityId: 'city-chennai' },
    { id: 'ward-14', zoneNumber: '14', name: 'Zone 14: Perungudi', code: 'Z14-W181', cityId: 'city-chennai' },
    { id: 'ward-15', zoneNumber: '15', name: 'Zone 15: Sholinganallur', code: 'Z15-W198', cityId: 'city-chennai' },
    { id: 'ward-07', zoneNumber: '07', name: 'Zone 7: Ambattur', code: 'Z07-W085', cityId: 'city-chennai' }
  ];

  const users = [
    {
      id: 'usr-city',
      username: 'city_admin',
      passwordHash: hash,
      fullName: 'Dr. K. Radhakrishnan (Chief Municipal Commissioner)',
      email: 'commissioner@chennaicorporation.gov.in',
      roleId: 'role-city',
      wardId: null
    },
    {
      id: 'usr-ward',
      username: 'ward_admin',
      passwordHash: hash,
      fullName: 'S. Vengatesan (Executive Engineer, Zone 13)',
      email: 'ee.zone13@chennaicorporation.gov.in',
      roleId: 'role-ward',
      wardId: 'ward-13'
    },
    {
      id: 'usr-dev',
      username: 'developer_admin',
      passwordHash: hash,
      fullName: 'Arunachalam Murugan (Edge-AI Systems Lead)',
      email: 'edge.lead@omnisight.ai',
      roleId: 'role-dev',
      wardId: null
    }
  ];

  const devices = [
    { id: 'dev-47', deviceSerial: 'JETSON-ORIN-047', ipAddress: '10.244.12.47', firmwareVer: 'v2.4.1', status: 'ONLINE', sqliteUsageMb: 38, jetsonTempC: 54, lteDbm: -72, camFps: 30.0 },
    { id: 'dev-19', deviceSerial: 'JETSON-ORIN-019', ipAddress: '10.244.12.19', firmwareVer: 'v2.4.1', status: 'ONLINE', sqliteUsageMb: 44, jetsonTempC: 57, lteDbm: -78, camFps: 29.8 },
    { id: 'dev-29', deviceSerial: 'JETSON-ORIN-029', ipAddress: '10.244.12.29', firmwareVer: 'v2.4.1', status: 'ONLINE', sqliteUsageMb: 29, jetsonTempC: 52, lteDbm: -69, camFps: 30.0 },
    { id: 'dev-05', deviceSerial: 'JETSON-ORIN-005', ipAddress: '10.244.12.05', firmwareVer: 'v2.4.1', status: 'ONLINE', sqliteUsageMb: 51, jetsonTempC: 61, lteDbm: -81, camFps: 30.0 },
    { id: 'dev-21', deviceSerial: 'JETSON-ORIN-021', ipAddress: '10.244.12.21', firmwareVer: 'v2.4.1', status: 'ONLINE', sqliteUsageMb: 33, jetsonTempC: 55, lteDbm: -74, camFps: 29.9 },
    { id: 'dev-01', deviceSerial: 'JETSON-ORIN-001', ipAddress: '10.244.12.01', firmwareVer: 'v2.4.1', status: 'ONLINE', sqliteUsageMb: 40, jetsonTempC: 53, lteDbm: -70, camFps: 30.0 }
  ];

  const vehicles = [
    { id: 'veh-47', vehicleNumber: '47', route: 'Adyar ⇄ Broadway', deviceId: 'dev-47', type: 'MTC Electric Fleet Bus' },
    { id: 'veh-19', vehicleNumber: '19B', route: 'T.Nagar ⇄ Kelambakkam', deviceId: 'dev-19', type: 'MTC Electric Fleet Bus' },
    { id: 'veh-29', vehicleNumber: '29C', route: 'Perambur ⇄ Besant Nagar', deviceId: 'dev-29', type: 'MTC Electric Fleet Bus' },
    { id: 'veh-05', vehicleNumber: '5C', route: 'Broadway ⇄ Taramani', deviceId: 'dev-05', type: 'MTC Electric Fleet Bus' },
    { id: 'veh-21', vehicleNumber: '21G', route: 'Tambaram ⇄ Broadway', deviceId: 'dev-21', type: 'MTC Electric Fleet Bus' },
    { id: 'veh-01', vehicleNumber: 'A1', route: 'Central ⇄ Thiruvanmiyur', deviceId: 'dev-01', type: 'MTC Electric Fleet Bus' }
  ];

  const roads = [
    { id: 'rd-anna', name: 'Anna Salai', corridor: 'DMS Junction (30m Segment)', cityId: 'city-chennai', startLat: 13.0441, startLng: 80.2502, endLat: 13.0444, endLng: 80.2505, status: 'CRITICAL', dailySocietalDrain: 284000 },
    { id: 'rd-lb', name: 'LB Road', corridor: 'Adyar Signal Approach (30m Segment)', cityId: 'city-chennai', startLat: 13.0034, startLng: 80.2551, endLat: 13.0037, endLng: 80.2554, status: 'CRITICAL', dailySocietalDrain: 195000 },
    { id: 'rd-ph', name: 'Poonamallee High Rd', corridor: 'Kilpauk Medical College Lateral', cityId: 'city-chennai', startLat: 13.0784, startLng: 80.2411, endLat: 13.0787, endLng: 80.2414, status: 'CRITICAL', dailySocietalDrain: 312000 },
    { id: 'rd-jn', name: 'Jawaharlal Nehru Rd', corridor: 'Koyambedu Flyover Base Approach', cityId: 'city-chennai', startLat: 13.0692, startLng: 80.1942, endLat: 13.0695, endLng: 80.1945, status: 'CRITICAL', dailySocietalDrain: 440000 },
    { id: 'rd-omr', name: 'Old Mahabalipuram Rd (OMR)', corridor: 'Taramani Tidal Park Ext', cityId: 'city-chennai', startLat: 12.9880, startLng: 80.2450, endLat: 12.9885, endLng: 80.2455, status: 'OPTIMAL', dailySocietalDrain: 12000 },
    { id: 'rd-kam', name: 'Kamarajar Salai', corridor: 'Marina Beach Promenade Corridor', cityId: 'city-chennai', startLat: 13.0500, startLng: 80.2820, endLat: 13.0510, endLng: 80.2825, status: 'OPTIMAL', dailySocietalDrain: 8000 }
  ];

  const telemetries = [
    { id: 'tel-1', deviceId: 'dev-47', latitude: 13.0034, longitude: 80.2551, speedKmph: 31.5, axG: -0.12, ayG: 0.04, azG: 3.95, visionConfidence: 0.98, rawLog: '[BUS#47] Crater Depth 15.0cm detected at LB Road' },
    { id: 'tel-2', deviceId: 'dev-29', latitude: 13.0112, longitude: 80.2344, speedKmph: 28.0, axG: -0.05, ayG: 0.02, azG: 2.65, visionConfidence: 0.94, rawLog: '[BUS#29C] Pothole 8.5cm detected at Sardar Patel Rd' },
    { id: 'tel-3', deviceId: 'dev-47', latitude: 13.0078, longitude: 80.2589, speedKmph: 35.0, axG: -0.08, ayG: 0.01, azG: 1.85, visionConfidence: 0.91, rawLog: '[BUS#47] Ravelling detected at Gandhi Nagar' },
    { id: 'tel-4', deviceId: 'dev-29', latitude: 12.9982, longitude: 80.2671, speedKmph: 26.5, axG: -0.04, ayG: 0.03, azG: 2.82, visionConfidence: 0.93, rawLog: '[BUS#29C] Depression detected at Besant Nagar' },
    { id: 'tel-5', deviceId: 'dev-47', latitude: 13.0055, longitude: 80.2488, speedKmph: 33.0, axG: -0.10, ayG: 0.05, azG: 3.75, visionConfidence: 0.97, rawLog: '[BUS#47] Crater detected at Kasturba Nagar' },
    { id: 'tel-6', deviceId: 'dev-47', latitude: 13.0441, longitude: 80.2502, speedKmph: 30.0, axG: -0.11, ayG: 0.04, azG: 3.82, visionConfidence: 0.98, rawLog: '[BUS#47] Crater detected at Anna Salai DMS' },
    { id: 'tel-7', deviceId: 'dev-19', latitude: 13.0784, longitude: 80.2411, speedKmph: 29.5, axG: -0.09, ayG: 0.02, azG: 3.41, visionConfidence: 0.95, rawLog: '[BUS#19B] Waterlogged dip detected at Poonamallee' },
    { id: 'tel-8', deviceId: 'dev-05', latitude: 13.0692, longitude: 80.1942, speedKmph: 34.0, axG: -0.13, ayG: 0.06, azG: 3.65, visionConfidence: 0.97, rawLog: '[BUS#5C] Crater detected at Koyambedu Flyover' }
  ];

  const hazards = [
    { id: 'haz-1', hazardCode: 'HAZ-1049', type: 'CRATER', severity: 'L1', latitude: 13.0034, longitude: 80.2551, depthCm: 15.0, spikeG: 3.95, confidenceScore: 0.98, roadId: 'rd-lb', wardId: 'ward-13', telemetryId: 'tel-1', createdAt: new Date().toISOString() },
    { id: 'haz-2', hazardCode: 'HAZ-1050', type: 'POTHOLE', severity: 'L2', latitude: 13.0112, longitude: 80.2344, depthCm: 8.5, spikeG: 2.65, confidenceScore: 0.94, roadId: 'rd-lb', wardId: 'ward-13', telemetryId: 'tel-2', createdAt: new Date().toISOString() },
    { id: 'haz-3', hazardCode: 'HAZ-1051', type: 'SURFACE_RAVELLING', severity: 'L3', latitude: 13.0078, longitude: 80.2589, depthCm: 4.2, spikeG: 1.85, confidenceScore: 0.91, roadId: 'rd-lb', wardId: 'ward-13', telemetryId: 'tel-3', createdAt: new Date().toISOString() },
    { id: 'haz-4', hazardCode: 'HAZ-1052', type: 'DEPRESSION', severity: 'L2', latitude: 12.9982, longitude: 80.2671, depthCm: 9.1, spikeG: 2.82, confidenceScore: 0.93, roadId: 'rd-lb', wardId: 'ward-13', telemetryId: 'tel-4', createdAt: new Date().toISOString() },
    { id: 'haz-5', hazardCode: 'HAZ-1053', type: 'CRATER', severity: 'L1', latitude: 13.0055, longitude: 80.2488, depthCm: 13.8, spikeG: 3.75, confidenceScore: 0.97, roadId: 'rd-lb', wardId: 'ward-13', telemetryId: 'tel-5', createdAt: new Date().toISOString() },
    { id: 'haz-6', hazardCode: 'HAZ-1054', type: 'CRATER', severity: 'L1', latitude: 13.0441, longitude: 80.2502, depthCm: 14.2, spikeG: 3.82, confidenceScore: 0.98, roadId: 'rd-anna', wardId: 'ward-09', telemetryId: 'tel-6', createdAt: new Date().toISOString() },
    { id: 'haz-7', hazardCode: 'HAZ-1055', type: 'WATERLOGGING', severity: 'L2', latitude: 13.0784, longitude: 80.2411, depthCm: 12.8, spikeG: 3.41, confidenceScore: 0.95, roadId: 'rd-ph', wardId: 'ward-08', telemetryId: 'tel-7', createdAt: new Date().toISOString() },
    { id: 'haz-8', hazardCode: 'HAZ-1056', type: 'CRATER', severity: 'L1', latitude: 13.0692, longitude: 80.1942, depthCm: 13.9, spikeG: 3.65, confidenceScore: 0.97, roadId: 'rd-jn', wardId: 'ward-10', telemetryId: 'tel-8', createdAt: new Date().toISOString() }
  ];

  const incidents = [
    { id: 'inc-1', ticketNumber: 'WO-1049', title: 'LB Road Deep Crater Patch', type: 'Single Pothole (L1)', priority: 'L1', status: 'DETECTED', hazardId: 'haz-1', wardId: 'ward-13', contractor: 'Coromandel Infra', etaMinutes: 18, notes: 'Edge bus #47 alert', createdAt: new Date().toISOString() },
    { id: 'inc-2', ticketNumber: 'WO-1050', title: 'Sardar Patel Rd 30m Micro-overlay', type: '30m Cluster (L2)', priority: 'L2', status: 'IN_PROGRESS', hazardId: 'haz-2', wardId: 'ward-13', contractor: 'South Madras Works', etaMinutes: 45, notes: 'Micro-overlay crew on site', createdAt: new Date().toISOString() },
    { id: 'inc-3', ticketNumber: 'WO-1051', title: 'Gandhi Nagar Thermoplastic Repainting', type: 'Faded Zebra Crossing (L3)', priority: 'L3', status: 'RESOLVED', hazardId: 'haz-3', wardId: 'ward-13', contractor: 'GCC In-house', etaMinutes: 0, notes: 'Thermoplastic cure complete', createdAt: new Date().toISOString() },
    { id: 'inc-4', ticketNumber: 'WO-1052', title: 'Besant Nagar 2nd Avenue Asphalt Leveling', type: 'Depression Cluster (L2)', priority: 'L2', status: 'ASSIGNED', hazardId: 'haz-4', wardId: 'ward-13', contractor: 'Coromandel Infra', etaMinutes: 60, notes: 'Awaiting aggregate delivery', createdAt: new Date().toISOString() },
    { id: 'inc-5', ticketNumber: 'WO-1053', title: 'Kasturba Nagar Railway Border Pothole', type: 'Single Pothole (L1)', priority: 'L1', status: 'VERIFIED', hazardId: 'haz-5', wardId: 'ward-13', contractor: 'South Madras Works', etaMinutes: 20, notes: 'Camera verified by Bus #47', createdAt: new Date().toISOString() }
  ];

  const repairs = [
    { id: 'rep-1', incidentId: 'inc-1', repairCostInr: 65000, estimatedDrainSavedInr: 195000, roiMultiplier: 3.0, status: 'PENDING', verificationVerdict: 'PENDING', createdAt: new Date().toISOString() },
    { id: 'rep-2', incidentId: 'inc-2', repairCostInr: 85000, estimatedDrainSavedInr: 284000, roiMultiplier: 3.3, status: 'PENDING', verificationVerdict: 'PENDING', createdAt: new Date().toISOString() },
    { id: 'rep-3', incidentId: 'inc-3', repairCostInr: 35000, estimatedDrainSavedInr: 90000, roiMultiplier: 2.6, status: 'COMPLETED', verificationVerdict: 'PASSED', createdAt: new Date().toISOString() },
    { id: 'rep-4', incidentId: 'inc-4', repairCostInr: 92000, estimatedDrainSavedInr: 312000, roiMultiplier: 3.4, status: 'APPROVED', verificationVerdict: 'PENDING', createdAt: new Date().toISOString() },
    { id: 'rep-5', incidentId: 'inc-5', repairCostInr: 120000, estimatedDrainSavedInr: 440000, roiMultiplier: 3.6, status: 'PENDING', verificationVerdict: 'PENDING', createdAt: new Date().toISOString() }
  ];

  const statusHistories = [
    { id: 'sh-1', incidentId: 'inc-1', previousStatus: 'NEW', newStatus: 'DETECTED', notes: 'Sensor telemetry ingestion', timestamp: new Date().toISOString() },
    { id: 'sh-2', incidentId: 'inc-2', previousStatus: 'ASSIGNED', newStatus: 'IN_PROGRESS', notes: 'Crew dispatched', timestamp: new Date().toISOString() }
  ];

  const auditLogs = [
    { id: 'aud-1', userId: 'usr-city', action: 'SYSTEM_BOOTSTRAP', details: 'OmniSight database initialized with Chennai infrastructure grid.', timestamp: new Date().toISOString() }
  ];

  return {
    roles,
    cities,
    wards,
    users,
    vehicles,
    devices,
    sensors: [],
    roads,
    hazards,
    incidents,
    telemetries,
    repairs,
    statusHistories,
    auditLogs
  };
}

class PersistentStore {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      } catch (e) {
        console.warn('Failed to parse database file, re-seeding...');
      }
    }
    const initial = getInitialSeedData();
    this.save(initial);
    return initial;
  }

  public save(data?: DatabaseSchema) {
    if (data) this.data = data;
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e: any) {
      // In serverless / read-only environment, keep changes in memory without throwing
      console.warn('[DB] Persistent file write warning:', e.message);
    }
  }


  public getTable(name: keyof DatabaseSchema): any[] {
    if (!this.data[name]) this.data[name] = [];
    return this.data[name];
  }
}

const store = new PersistentStore();

function matchCriteria(item: any, where?: any): boolean {
  if (!where) return true;
  for (const key of Object.keys(where)) {
    if (where[key] !== undefined && item[key] !== where[key]) {
      return false;
    }
  }
  return true;
}

function resolveIncludes(table: string, item: any, include?: any): any {
  if (!include || !item) return item;
  const res = { ...item };

  if (table === 'users') {
    if (include.role) {
      res.role = store.getTable('roles').find(r => r.id === item.roleId);
    }
    if (include.ward) {
      res.ward = store.getTable('wards').find(w => w.id === item.wardId) || null;
    }
  }

  if (table === 'wards') {
    if (include.city) {
      res.city = store.getTable('cities').find(c => c.id === item.cityId);
    }
    if (include.hazards) {
      res.hazards = store.getTable('hazards').filter(h => h.wardId === item.id);
    }
    if (include.incidents) {
      res.incidents = store.getTable('incidents').filter(i => i.wardId === item.id);
    }
  }

  if (table === 'hazards') {
    if (include.road) {
      res.road = store.getTable('roads').find(r => r.id === item.roadId);
    }
    if (include.ward) {
      res.ward = store.getTable('wards').find(w => w.id === item.wardId);
    }
    if (include.incidents) {
      res.incidents = store.getTable('incidents').filter(i => i.hazardId === item.id);
    }
  }

  if (table === 'incidents') {
    if (include.hazard) {
      const h = store.getTable('hazards').find(x => x.id === item.hazardId);
      res.hazard = h ? resolveIncludes('hazards', h, include.hazard.include) : null;
    }
    if (include.ward) {
      res.ward = store.getTable('wards').find(w => w.id === item.wardId);
    }
    if (include.repairs) {
      res.repairs = store.getTable('repairs').filter(r => r.incidentId === item.id);
    }
    if (include.statusHistories) {
      res.statusHistories = store.getTable('statusHistories').filter(s => s.incidentId === item.id);
    }
  }

  if (table === 'devices') {
    if (include.vehicle) {
      res.vehicle = store.getTable('vehicles').find(v => v.deviceId === item.id);
    }
    if (include.sensors) {
      res.sensors = store.getTable('sensors').filter(s => s.deviceId === item.id);
    }
  }

  if (table === 'repairs') {
    if (include.incident) {
      const inc = store.getTable('incidents').find(i => i.id === item.incidentId);
      res.incident = inc ? resolveIncludes('incidents', inc, include.incident.include) : null;
    }
  }

  return res;
}

function createModelHandler(tableName: keyof DatabaseSchema) {
  return {
    async findUnique({ where, include }: { where: any; include?: any }) {
      const table = store.getTable(tableName);
      const item = table.find(i => matchCriteria(i, where));
      return item ? resolveIncludes(tableName, item, include) : null;
    },

    async findMany(args?: { where?: any; include?: any; orderBy?: any; take?: number }) {
      let items = [...store.getTable(tableName)];
      if (args?.where) {
        items = items.filter(i => matchCriteria(i, args.where));
      }
      if (args?.include) {
        items = items.map(i => resolveIncludes(tableName, i, args.include));
      }
      if (args?.take) {
        items = items.slice(0, args.take);
      }
      return items;
    },

    async create({ data, include }: { data: any; include?: any }) {
      const table = store.getTable(tableName);
      const newItem = {
        id: data.id || `${tableName.slice(0, 3)}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        createdAt: new Date().toISOString(),
        ...data
      };
      table.push(newItem);
      store.save();
      return resolveIncludes(tableName, newItem, include);
    },

    async createMany({ data }: { data: any[] }) {
      const table = store.getTable(tableName);
      for (const d of data) {
        table.push({
          id: d.id || `${tableName.slice(0, 3)}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          createdAt: new Date().toISOString(),
          ...d
        });
      }
      store.save();
      return { count: data.length };
    },

    async update({ where, data, include }: { where: any; data: any; include?: any }) {
      const table = store.getTable(tableName);
      const idx = table.findIndex(i => matchCriteria(i, where));
      if (idx === -1) throw new Error(`Record not found in ${tableName}`);
      table[idx] = { ...table[idx], ...data, updatedAt: new Date().toISOString() };
      store.save();
      return resolveIncludes(tableName, table[idx], include);
    },

    async updateMany({ where, data }: { where?: any; data: any }) {
      const table = store.getTable(tableName);
      let count = 0;
      for (let i = 0; i < table.length; i++) {
        if (matchCriteria(table[i], where)) {
          table[i] = { ...table[i], ...data, updatedAt: new Date().toISOString() };
          count++;
        }
      }
      store.save();
      return { count };
    },

    async upsert({ where, update, create, include }: { where: any; update: any; create: any; include?: any }) {
      const existing = await this.findUnique({ where });
      if (existing) {
        return this.update({ where, data: update, include });
      } else {
        return this.create({ data: create, include });
      }
    },

    async delete({ where }: { where: any }) {
      const table = store.getTable(tableName);
      const idx = table.findIndex(i => matchCriteria(i, where));
      if (idx === -1) throw new Error(`Record not found in ${tableName}`);
      const removed = table.splice(idx, 1)[0];
      store.save();
      return removed;
    }
  };
}

export const prisma = {
  role: createModelHandler('roles'),
  city: createModelHandler('cities'),
  ward: createModelHandler('wards'),
  user: createModelHandler('users'),
  vehicle: createModelHandler('vehicles'),
  device: createModelHandler('devices'),
  sensor: createModelHandler('sensors'),
  road: createModelHandler('roads'),
  hazard: createModelHandler('hazards'),
  incident: createModelHandler('incidents'),
  telemetry: createModelHandler('telemetries'),
  repair: createModelHandler('repairs'),
  statusHistory: createModelHandler('statusHistories'),
  auditLog: createModelHandler('auditLogs'),
  $disconnect: async () => {}
};
