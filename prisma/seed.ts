import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting OmniSight Database Seeding...');

  // 1. Roles
  const cityRole = await prisma.role.upsert({
    where: { name: 'CITY' },
    update: {},
    create: {
      name: 'CITY',
      description: 'City Municipal Official - Full city-wide road health, economic drain & budget governance'
    }
  });

  const wardRole = await prisma.role.upsert({
    where: { name: 'WARD' },
    update: {},
    create: {
      name: 'WARD',
      description: 'Ward Engineer - Localized ward triage, crew dispatch & repair lifecycle verification'
    }
  });

  const devRole = await prisma.role.upsert({
    where: { name: 'DEVELOPER' },
    update: {},
    create: {
      name: 'DEVELOPER',
      description: 'Edge-AI Systems Engineer - Fleet sensor nodes, live telemetry stream & OTA firmware'
    }
  });

  // 2. City
  const chennai = await prisma.city.create({
    data: {
      name: 'Greater Chennai Corporation',
      state: 'Tamil Nadu'
    }
  });

  // 3. Wards
  const wardsData = [
    { zoneNumber: '13', name: 'Zone 13: Adyar', code: 'Z13-W172' },
    { zoneNumber: '09', name: 'Zone 9: Teynampet', code: 'Z09-W118' },
    { zoneNumber: '08', name: 'Zone 8: Anna Nagar', code: 'Z08-W104' },
    { zoneNumber: '10', name: 'Zone 10: Kodambakkam', code: 'Z10-W132' },
    { zoneNumber: '05', name: 'Zone 5: Royapuram', code: 'Z05-W052' },
    { zoneNumber: '04', name: 'Zone 4: Tondiarpet', code: 'Z04-W039' },
    { zoneNumber: '14', name: 'Zone 14: Perungudi', code: 'Z14-W181' },
    { zoneNumber: '15', name: 'Zone 15: Sholinganallur', code: 'Z15-W198' },
    { zoneNumber: '07', name: 'Zone 7: Ambattur', code: 'Z07-W085' }
  ];

  const wardsMap: Record<string, any> = {};
  for (const w of wardsData) {
    const ward = await prisma.ward.upsert({
      where: { code: w.code },
      update: {},
      create: {
        zoneNumber: w.zoneNumber,
        name: w.name,
        code: w.code,
        cityId: chennai.id
      }
    });
    wardsMap[w.zoneNumber] = ward;
  }

  // 4. Default Passwords: OmniSight@2026
  const passwordHash = await bcrypt.hash('OmniSight@2026', 10);

  // Users
  const cityAdmin = await prisma.user.upsert({
    where: { username: 'city_admin' },
    update: { passwordHash },
    create: {
      username: 'city_admin',
      passwordHash,
      fullName: 'Dr. K. Radhakrishnan (Chief Municipal Commissioner)',
      email: 'commissioner@chennaicorporation.gov.in',
      roleId: cityRole.id
    }
  });

  const wardAdmin = await prisma.user.upsert({
    where: { username: 'ward_admin' },
    update: { passwordHash },
    create: {
      username: 'ward_admin',
      passwordHash,
      fullName: 'S. Vengatesan (Executive Engineer, Zone 13)',
      email: 'ee.zone13@chennaicorporation.gov.in',
      roleId: wardRole.id,
      wardId: wardsMap['13'].id
    }
  });

  const devAdmin = await prisma.user.upsert({
    where: { username: 'developer_admin' },
    update: { passwordHash },
    create: {
      username: 'developer_admin',
      passwordHash,
      fullName: 'Arunachalam Murugan (Edge-AI Systems Lead)',
      email: 'edge.lead@omnisight.ai',
      roleId: devRole.id
    }
  });

  console.log('✅ Accounts Created:');
  console.log('  - city_admin / OmniSight@2026');
  console.log('  - ward_admin / OmniSight@2026');
  console.log('  - developer_admin / OmniSight@2026');

  // 5. Vehicles & Edge Devices
  const fleet = [
    { bus: '47', route: 'Adyar ⇄ Broadway', serial: 'JETSON-ORIN-047', temp: 54, lte: -72, sqlite: 38, fps: 30.0 },
    { bus: '19B', route: 'T.Nagar ⇄ Kelambakkam', serial: 'JETSON-ORIN-019', temp: 57, lte: -78, sqlite: 44, fps: 29.8 },
    { bus: '29C', route: 'Perambur ⇄ Besant Nagar', serial: 'JETSON-ORIN-029', temp: 52, lte: -69, sqlite: 29, fps: 30.0 },
    { bus: '5C', route: 'Broadway ⇄ Taramani', serial: 'JETSON-ORIN-005', temp: 61, lte: -81, sqlite: 51, fps: 30.0 },
    { bus: '21G', route: 'Tambaram ⇄ Broadway', serial: 'JETSON-ORIN-021', temp: 55, lte: -74, sqlite: 33, fps: 29.9 },
    { bus: 'A1', route: 'Central ⇄ Thiruvanmiyur', serial: 'JETSON-ORIN-001', temp: 53, lte: -70, sqlite: 40, fps: 30.0 }
  ];

  const devicesMap: Record<string, any> = {};

  for (const item of fleet) {
    const device = await prisma.device.upsert({
      where: { deviceSerial: item.serial },
      update: {
        jetsonTempC: item.temp,
        lteDbm: item.lte,
        sqliteUsageMb: item.sqlite,
        camFps: item.fps
      },
      create: {
        deviceSerial: item.serial,
        ipAddress: `10.244.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`,
        firmwareVer: 'v2.4.1-orin',
        status: 'ONLINE',
        sqliteUsageMb: item.sqlite,
        jetsonTempC: item.temp,
        lteDbm: item.lte,
        camFps: item.fps
      }
    });

    devicesMap[item.bus] = device;

    await prisma.vehicle.upsert({
      where: { vehicleNumber: item.bus },
      update: { route: item.route, deviceId: device.id },
      create: {
        vehicleNumber: item.bus,
        route: item.route,
        type: 'MTC Electric Fleet Bus',
        deviceId: device.id
      }
    });

    // Sensors
    await prisma.sensor.createMany({
      data: [
        { deviceId: device.id, type: 'CAMERA_4K', model: 'Sony IMX577 Ultra HDR', sampleRateHz: 30 },
        { deviceId: device.id, type: 'IMU_6AXIS', model: 'Bosch BMI088 High-G', sampleRateHz: 200 },
        { deviceId: device.id, type: 'GPS_RTK', model: 'u-blox ZED-F9P Centimeter-level', sampleRateHz: 10 },
        { deviceId: device.id, type: 'LIDAR', model: 'Livox Mid-360 Solid-State', sampleRateHz: 20 }
      ]
    });
  }

  // 6. Roads
  const roadsData = [
    {
      name: 'Anna Salai',
      corridor: 'DMS Junction (30m Segment)',
      startLat: 13.0441,
      startLng: 80.2502,
      endLat: 13.0444,
      endLng: 80.2505,
      status: 'CRITICAL',
      dailySocietalDrain: 284000
    },
    {
      name: 'LB Road',
      corridor: 'Adyar Signal Approach (30m Segment)',
      startLat: 13.0034,
      startLng: 80.2551,
      endLat: 13.0037,
      endLng: 80.2554,
      status: 'CRITICAL',
      dailySocietalDrain: 195000
    },
    {
      name: 'Poonamallee High Rd',
      corridor: 'Kilpauk Medical College Lateral',
      startLat: 13.0784,
      startLng: 80.2411,
      endLat: 13.0787,
      endLng: 80.2414,
      status: 'CRITICAL',
      dailySocietalDrain: 312000
    },
    {
      name: 'Jawaharlal Nehru Rd',
      corridor: 'Koyambedu Flyover Base Approach',
      startLat: 13.0692,
      startLng: 80.1942,
      endLat: 13.0695,
      endLng: 80.1945,
      status: 'CRITICAL',
      dailySocietalDrain: 440000
    },
    {
      name: 'Old Mahabalipuram Rd (OMR)',
      corridor: 'Taramani Tidal Park Ext',
      startLat: 12.9880,
      startLng: 80.2450,
      endLat: 12.9885,
      endLng: 80.2455,
      status: 'OPTIMAL',
      dailySocietalDrain: 12000
    },
    {
      name: 'Kamarajar Salai',
      corridor: 'Marina Beach Promenade Corridor',
      startLat: 13.0500,
      startLng: 80.2820,
      endLat: 13.0510,
      endLng: 80.2825,
      status: 'OPTIMAL',
      dailySocietalDrain: 8000
    }
  ];

  const roadsMap: Record<string, any> = {};
  for (const r of roadsData) {
    const road = await prisma.road.create({
      data: {
        name: r.name,
        corridor: r.corridor,
        cityId: chennai.id,
        startLat: r.startLat,
        startLng: r.startLng,
        endLat: r.endLat,
        endLng: r.endLng,
        status: r.status,
        dailySocietalDrain: r.dailySocietalDrain
      }
    });
    roadsMap[r.name] = road;
  }

  // 7. Telemetry & Hazards
  const hazardsData = [
    {
      code: 'HAZ-1049',
      type: 'CRATER',
      severity: 'L1',
      lat: 13.0034,
      lng: 80.2551,
      depth: 15.0,
      spikeG: 3.95,
      conf: 0.98,
      road: 'LB Road',
      ward: '13',
      bus: '47',
      ticket: 'WO-1049',
      title: 'LB Road Deep Crater Patch',
      status: 'DETECTED',
      contractor: 'Coromandel Infra'
    },
    {
      code: 'HAZ-1050',
      type: 'POTHOLE',
      severity: 'L2',
      lat: 13.0112,
      lng: 80.2344,
      depth: 8.5,
      spikeG: 2.65,
      conf: 0.94,
      road: 'LB Road',
      ward: '13',
      bus: '29C',
      ticket: 'WO-1050',
      title: 'Sardar Patel Rd 30m Micro-overlay',
      status: 'IN_PROGRESS',
      contractor: 'South Madras Works'
    },
    {
      code: 'HAZ-1051',
      type: 'SURFACE_RAVELLING',
      severity: 'L3',
      lat: 13.0078,
      lng: 80.2589,
      depth: 4.2,
      spikeG: 1.85,
      conf: 0.91,
      road: 'LB Road',
      ward: '13',
      bus: '47',
      ticket: 'WO-1051',
      title: 'Gandhi Nagar Thermoplastic Repainting',
      status: 'RESOLVED',
      contractor: 'GCC In-house'
    },
    {
      code: 'HAZ-1052',
      type: 'DEPRESSION',
      severity: 'L2',
      lat: 12.9982,
      lng: 80.2671,
      depth: 9.1,
      spikeG: 2.82,
      conf: 0.93,
      road: 'LB Road',
      ward: '13',
      bus: '29C',
      ticket: 'WO-1052',
      title: 'Besant Nagar 2nd Avenue Asphalt Leveling',
      status: 'ASSIGNED',
      contractor: 'Coromandel Infra'
    },
    {
      code: 'HAZ-1053',
      type: 'CRATER',
      severity: 'L1',
      lat: 13.0055,
      lng: 80.2488,
      depth: 13.8,
      spikeG: 3.75,
      conf: 0.97,
      road: 'LB Road',
      ward: '13',
      bus: '47',
      ticket: 'WO-1053',
      title: 'Kasturba Nagar Railway Border Pothole',
      status: 'VERIFIED',
      contractor: 'South Madras Works'
    },
    {
      code: 'HAZ-1054',
      type: 'CRATER',
      severity: 'L1',
      lat: 13.0441,
      lng: 80.2502,
      depth: 14.2,
      spikeG: 3.82,
      conf: 0.98,
      road: 'Anna Salai',
      ward: '09',
      bus: '47',
      ticket: 'WO-1054',
      title: 'Anna Salai DMS Severe Crater Cluster',
      status: 'DETECTED',
      contractor: 'Coromandel Infra'
    },
    {
      code: 'HAZ-1055',
      type: 'WATERLOGGING',
      severity: 'L2',
      lat: 13.0784,
      lng: 80.2411,
      depth: 12.8,
      spikeG: 3.41,
      conf: 0.95,
      road: 'Poonamallee High Rd',
      ward: '08',
      bus: '19B',
      ticket: 'WO-1055',
      title: 'Poonamallee High Rd Waterlogged Bitumen Dip',
      status: 'DETECTED',
      contractor: 'South Madras Works'
    },
    {
      code: 'HAZ-1056',
      type: 'CRATER',
      severity: 'L1',
      lat: 13.0692,
      lng: 80.1942,
      depth: 13.9,
      spikeG: 3.65,
      conf: 0.97,
      road: 'Jawaharlal Nehru Rd',
      ward: '10',
      bus: '5C',
      ticket: 'WO-1056',
      title: 'Koyambedu Flyover Ramp Crater Spill',
      status: 'DETECTED',
      contractor: 'Coromandel Infra'
    }
  ];

  for (const h of hazardsData) {
    const dev = devicesMap[h.bus];
    const tel = await prisma.telemetry.create({
      data: {
        deviceId: dev.id,
        latitude: h.lat,
        longitude: h.lng,
        speedKmph: 31.5,
        axG: -0.12,
        ayG: 0.04,
        azG: h.spikeG,
        visionConfidence: h.conf,
        rawLog: `[TELEMETRY] Bus #${h.bus} captured ${h.type} at ${h.lat}, ${h.lng} with ${h.spikeG}G deflection.`
      }
    });

    const road = roadsMap[h.road] || Object.values(roadsMap)[0];
    const ward = wardsMap[h.ward] || Object.values(wardsMap)[0];

    const hazard = await prisma.hazard.create({
      data: {
        hazardCode: h.code,
        type: h.type,
        severity: h.severity,
        latitude: h.lat,
        longitude: h.lng,
        depthCm: h.depth,
        spikeG: h.spikeG,
        confidenceScore: h.conf,
        roadId: road.id,
        wardId: ward.id,
        telemetryId: tel.id
      }
    });

    const incident = await prisma.incident.create({
      data: {
        ticketNumber: h.ticket,
        title: h.title,
        type: `${h.type} (${h.severity})`,
        priority: h.severity,
        status: h.status,
        hazardId: hazard.id,
        wardId: ward.id,
        contractor: h.contractor,
        etaMinutes: 18,
        notes: `Detected by edge-AI on Bus #${h.bus} via IMU spike ${h.spikeG}G and Vision confidence ${Math.round(h.conf * 100)}%.`
      }
    });

    // Initial Status History
    await prisma.statusHistory.create({
      data: {
        incidentId: incident.id,
        previousStatus: 'NEW',
        newStatus: h.status,
        notes: 'Initial edge ingestion from transit telemetry'
      }
    });

    // Associated Repair
    await prisma.repair.create({
      data: {
        incidentId: incident.id,
        repairCostInr: h.severity === 'L1' ? 85000 : (h.severity === 'L2' ? 65000 : 35000),
        estimatedDrainSavedInr: h.severity === 'L1' ? 284000 : (h.severity === 'L2' ? 195000 : 90000),
        roiMultiplier: 3.2,
        status: h.status === 'RESOLVED' ? 'COMPLETED' : 'PENDING',
        verificationVerdict: h.status === 'RESOLVED' ? 'PASSED' : 'PENDING'
      }
    });
  }

  // 8. Initial Audit Log
  await prisma.auditLog.create({
    data: {
      userId: cityAdmin.id,
      action: 'SYSTEM_BOOTSTRAP',
      details: 'OmniSight Chennai database seeded successfully with 8 road corridors and 6 edge transit buses.'
    }
  });

  console.log('🎉 OmniSight Database Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
