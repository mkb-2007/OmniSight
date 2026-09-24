# OmniSight 🛣️🚌

**Municipal Road Infrastructure Intelligence & Edge-AI Fleet Platform**  
*Greater Chennai Corporation (GCC) & Metropolitan Transport Corporation (MTC)*

---

## 🌟 Overview

**OmniSight** is an enterprise-grade municipal infrastructure intelligence and edge-AI platform. It leverages public transport buses equipped with rooftop lidar sensors, vision cameras, and onboard NVIDIA Jetson edge computing units to continuously scan road conditions in real time.

By transforming transit fleets into roving infrastructure sensors, OmniSight detects road surface deterioration (potholes, severe craters, surface cracks), calculates direct societal economic drain (fuel loss, vehicle suspension damage, transit deceleration), and streamlines triage, work orders, and anti-fraud repair verification across city jurisdictions.

---

## 🏛️ Tri-Portal Role-Based Architecture

OmniSight provides three specialized, role-guarded portals:

### 1. 🏛️ City Official Portal (`/city`)
- **Macro Economic Impact & Societal Drain**: Real-time aggregation of fuel loss, suspension wear, and traffic deceleration math across Chennai corridors.
- **Ward Performance Leaderboard**: Comparative metrics across zones and wards (SLA compliance, repair turnaround, active hazard count).
- **Capital Budget Allocation**: Infrastructure investment tracking with ROI calculations (e.g., societal drain savings per rupee spent).
- **Citywide Interactive GIS Heatmap**: Corridors mapped with hazard severity overlays (L1 Critical, L2 Major, L3 Minor).

### 2. 📍 Ward Execution Portal (`/ward`)
- **Active Priority Hazard Triage**: SLA-ranked queue of autonomous edge-detected road faults for immediate dispatch.
- **Work Order Kanban**: Drag-and-drop workflow tracking (`Triaged` → `Contractor Dispatched` → `Paving In Progress` → `Verification Pending` → `Closed`).
- **Anti-Fraud Repair Verification**: Computer-vision photo audit comparing pre-repair depression depth with post-repair surface compaction before contractor payment sign-off.
- **Contractor & SLA Governance**: Response time auditing for local roadwork vendors.

### 3. ⚙️ Developer & Edge-AI Fleet Portal (`/dev`)
- **Live Fleet Telemetry**: Real-time operational monitoring of 145+ MTC buses across major corridors (Adyar, T. Nagar, Central, Besant Nagar, etc.).
- **NVIDIA Jetson Orin Nano Edge Diagnostics**: Hardware telemetry (thermal monitoring, 6-core ARM CPU load, 1024-core Ampere GPU inference rate, camera FPS).
- **Sensor Fusion AI Stream**: Tri-axial IMU vertical G-force spike analysis with false-positive suppression (filtering vehicle vibration and dynamic maneuvers from genuine road craters).
- **Storage & Bandwidth Sync**: Circular SQLite buffer tracking, purge triggers, and low-pass filter frequency calibration.

---

## 🚀 Tech Stack

- **Frontend**: HTML5, Alpine.js, Tailwind CSS, Leaflet.js (GIS Mapping)
- **Backend**: Node.js, Express, TypeScript
- **Database**: SQLite / JSON persistent relational datastore with Prisma schema
- **Security**: JWT Authentication, Role-Based Access Control (RBAC), bcrypt credential hashing, brute-force rate-limiting
- **Build Tool**: Vite

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mkb-2007/OmniSight.git
   cd OmniSight
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

4. **Start the application**:
   ```bash
   # Start the Express backend (Port 3001)
   npm run server

   # In a separate terminal, start the Vite frontend (Port 3000)
   npm run dev
   ```

5. **Open in browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 🔑 Demo Credentials

| Role | Username | Password | Access Scope |
|---|---|---|---|
| **City Official** | `city_admin` | `Chennai@2026` | Macro Economic Audit, Budget Approvals, Citywide Heatmap |
| **Ward Officer** | `ward_admin` | `Adyar@Zone13` | Ward 172 Triage Feed, Kanban Work Orders, Repair Verification |
| **Developer** | `developer_admin` | `EdgeAI@Mesh9` | MTC Fleet Live Telemetry, NVIDIA Jetson Diagnostics, Hardware OTA |

---

## 🧪 Testing & Verification

Run automated test suites:

```bash
# Run authentication & RBAC security test suite
node test_auth.cjs

# Build production bundle
npm run build
```

---

## 📄 License

ISC License. Greater Chennai Corporation & OmniSight Infrastructure Intelligence Initiative.
