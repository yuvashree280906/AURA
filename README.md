# AURA — Meaning-First Adaptive Broadcasting for Low-Bandwidth Networks

> *“When bandwidth drops, essential information comes first.”*

AURA is an intelligent broadcasting framework designed to maintain the delivery of vital knowledge and instructions under severe, fluctuating, and low-bandwidth network environments (down to 20–50 kbps).

Traditional video streaming systems primarily adapt video bitrate and resolution (ABR). However, when connectivity drops below the minimum video bitrate threshold, conventional players buffer, freeze, stall, and completely block all information. AURA addresses this failure mode through **Deadline-Aware Priority Scheduling**, **Multi-Content Adaptive Delivery**, and **Live-First Background Recovery**.

---

## 🌟 Key Features

### 1. Deadline-Aware Priority Scheduling
- **Explicit Content Attributes**: Every item contains payload size, priority class (`P1_CRITICAL`, `P2_HIGH`, `P3_MEDIUM`, `P4_LOW`), creation timestamp, and expiration deadline.
- **Dynamic Urgency Scoring**: Items approaching their deadline receive a priority boost, ensuring time-critical warnings reach audiences before expiry.
- **Anti-Starvation Aging**: Waiting items accrue age credits, preventing lower-priority content from being permanently locked out once channel capacity permits.

### 2. Multi-Content Adaptive Delivery
Decomposes broadcasts into seven distinct information tiers:
1. **Critical Alerts & Urgent Text** (0.3–0.8 KB, immediate broadcast, &lt;300ms arrival).
2. **Captions & Speech Transcripts** (0.8–2.0 KB, continuous readability).
3. **Short Summaries & Key Explanations** (2–5 KB, compact knowledge synthesis).
4. **Compact Keyframes & Diagrams** (15–35 KB, visual contextual anchors).
5. **Compressed Audio Segments** (30–60 KB, uninterrupted voice instructions).
6. **Live Video Segments** (300–800 KB, visual media when capacity allows).
7. **Deferred Replay Segments** (Background recovery when spare bandwidth appears).

### 3. Live-First Recovery
- When network capacity recovers after an outage or drop, AURA instantly reconnects users to the current live point.
- Avoids obsolete historical video buffers blocking live instructions.
- Deferred past segments download in the background using spare bandwidth.

### 4. Interactive Network Simulation & Real HTTP Transfer Harness
- **Model Simulation**: Deterministic scheduling modeling bandwidth, latency, jitter, packet loss, and link outages.
- **Real HTTP Socket Probe**: Genuine throttled segment downloads from the backend endpoint (`/api/stream/chunk`), measuring real browser socket transfer times, byte streams, and throughput.

### 5. Measurable Performance Analytics
- Time to first essential message (e.g. 340ms in AURA vs 14,800ms in Baseline).
- Total buffering stall duration and freeze count.
- Delivery success rate and missed deadline tracking.
- Interactive Recharts visualization (latency comparison bars and cumulative waterfall curves).
- Exportable CSV and JSON reports.

---

## 🚀 Getting Started

### Installation
```bash
npm install
```

### Running in Development
```bash
npm run dev
```
The application will launch at `http://localhost:3000`.

### Building for Production
```bash
npm run build
npm start
```

---

## 🧪 Testing & Verification

### Run Type Checking & Linter
```bash
npm run lint
```

### Demonstration Scenarios
Pre-configured domain scenarios are accessible from the Home Dashboard or Broadcast Setup:
- **Emergency Communication**: Flash Flood Emergency & Dam Spillway Evacuation
- **Online Education & E-Learning**: Distributed Systems & Quorum Consensus Lecture
- **Breaking News & Journalism**: Earthquake Epicenter Live Field Dispatch
- **Healthcare & Remote Triage**: Remote Island Clinic Emergency Tele-Consultation

---

## ⚙️ Architecture & Project Structure

```
├── server.ts                       # Express backend with real HTTP segment throttling & persistence
├── src/
│   ├── types/
│   │   └── scheduler.ts            # ContentItem, NetworkProfile, PriorityClass, TestSessionReport
│   ├── services/
│   │   ├── scheduler.ts            # AURA deadline-aware priority engine & Baseline comparison
│   │   ├── realStreamProbe.ts      # Browser ReadableStream HTTP probe against /api/stream/chunk
│   │   ├── sampleScenarios.ts      # Multi-domain scenarios with realistic payloads and deadlines
│   │   └── reportStorage.ts        # LocalStorage and REST API sync with JSON/CSV export
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx          # Top navigation, network HUD badge, and AURA/Baseline toggle
│   │   │   └── Footer.tsx          # Clean footer
│   │   ├── studio/
│   │   │   ├── VideoPlayer.tsx     # Player with stall detection & canvas test pattern fallback
│   │   │   ├── PriorityQueueView.tsx# Dynamic queue cards, deadline countdowns, progress bar
│   │   │   ├── CriticalAlertsPanel.tsx# Emergency banner, Web Audio chime, and on-the-fly injection
│   │   │   ├── NetworkHud.tsx      # Real-time network telemetry and chaos triggers
│   │   │   └── LiveEventLog.tsx    # Live decision audit trail with filters and download
│   │   └── pages/
│   │       ├── HomeDashboard.tsx   # Page 1: Overview, target domains, quick launchers
│   │       ├── BroadcastSetup.tsx  # Page 2: Video file picker, scenario editor, queue builder
│   │       ├── LiveBroadcastStudio.tsx # Page 3: Live interactive broadcast player & pipeline
│   │       ├── NetworkLab.tsx      # Page 4: Interactive network throttle lab & HTTP probe
│   │       ├── PerformanceAnalytics.tsx # Page 5: Comparative metrics and Recharts visualizations
│   │       └── TestReports.tsx     # Page 6: Session archive, side-by-side comparison & export
│   ├── App.tsx                     # Top-level state and page router
│   ├── index.css                   # Global styles and typography
│   └── main.tsx                    # React DOM entrypoint
```

---

## 🛡️ Security & Privacy Notice
- Video files selected via the file picker are processed locally using object URLs (`URL.createObjectURL`).
- No private media is uploaded or stored on public third-party services without explicit user consent.
- All network benchmarking probes run against the local development server proxy.
