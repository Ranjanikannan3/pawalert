# 🐾 PawAlert AI — Intelligent Animal Accident Prevention & Rescue Management Platform Using AI and GIS

> **Tagline:** *"Prevent accidents before they happen. Rescue lives when they do."*

PawAlert AI is an intelligent civic-tech web platform designed to reduce street-animal vehicular collisions and coordinate emergency animal rescue operations by integrating **Deep Learning Computer Vision (MobileNetV2)**, **Geographical Information Systems (GIS)**, and **DBSCAN Density-Based Spatial Clustering**.

---

## 🎓 Viva / Presentation Explanation (In Simple Terms)

> *"PawAlert AI combines computer vision, database analytics, GIS, and location-based notifications. When a citizen uploads an accident image, the AI identifies whether the animal is a **Dog**, **Cat**, or **Cattle**. The report and GPS coordinates are stored permanently in MongoDB. Historical accident coordinates are then analyzed using **DBSCAN clustering** to identify locations where accidents repeatedly occur. These locations become accident hotspots and are visualized on a GIS map. When a driver approaches a high-risk hotspot, the system compares the driver's GPS location with the hotspot coordinates and generates a warning alert. In parallel, authorities and NGOs can manage reports and coordinate rescue operations."*

---

## 🏛️ System Architecture & Separation of Concerns

```
                                  [ Citizen Mobile / Web ]
                                             │ (Photo + GPS)
                                             ▼
                                   [ Node.js Express API ]
                                    │                   │
                     (Image Tensor) │                   │ (Geo-Tagged Report)
                                    ▼                   ▼
                     [ Python AI Microservice ]    [ MongoDB Database ]
                     (MobileNetV2 Classifier)           │
                     • Dog                              │ (Historical Coordinates)
                     • Cat                              ▼
                     • Cattle                 [ DBSCAN Clustering Engine ]
                                                        │
                                    ┌───────────────────┴───────────────────┐
                                    ▼                                       ▼
                       [ GIS Hotspot Radar Map ]                 [ Driver Safety HUD ]
                       (Authority Remediation)                  (Proximity Warning Siren)
```

> [!IMPORTANT]
> **Key Architectural Principle:**
> - **The Animal AI Image Dataset** is strictly used for computer vision classification (*Dog vs. Cat vs. Cattle*).
> - **The MongoDB Accident Database** is strictly used as the historical spatial dataset for *DBSCAN Hotspot Detection*.

---

## 🚀 Key Features

1. **AI Animal Identification Scanner**:
   - Classifies street animals (*Dog, Cat, Cattle*) with confidence metrics and probability distribution.
   - Powered by Python FastAPI with seamless Node.js heuristic fallback.

2. **DBSCAN Geographical Hotspot Clustering**:
   - Groups historical accident coordinates using the **Haversine Distance Formula** on real spherical coordinates.
   - Calculates cluster centroids, bounding radii, report counts, and risk levels (`HIGH` ≥ 10, `MEDIUM` 5–9, `LOW` 2–4).
   - Classifies isolated outlier incidents as noise.

3. **Driver Safety Proximity HUD & Siren Alerts**:
   - Compares driver's live GPS coordinates with active accident hotspots.
   - Triggers an audible siren chime and flashing emergency modal when entering the 350m danger perimeter.
   - Implements a **10-minute anti-spam cooldown** per hotspot.
   - Includes an **Interactive Driving Simulator** to test warnings without physical travel.

4. **Municipality Authority GIS & Analytics Suite**:
   - Hotspot density maps with color-coded circular zones (Red, Amber, Green).
   - Recharts analytical dashboards (Monthly trends, species distribution, area rankings).
   - Authority Action remediation tracker (warning signs, street lighting, speed breakers).

5. **NGO & Veterinary Rescue Dispatch Queue**:
   - 7-stage visual timeline tracker (*Requested → Assigned → Accepted → On the Way → Animal Reached → Rescued → Completed*).
   - Volunteer assignment, ambulance dispatch, and medical treatment logging.

6. **Citizen Reporting Portal**:
   - 5-step intuitive wizard with GPS detection, map pinpoint picker, and duplicate report prevention within 120m.

7. **1-Click Stakeholder Demo Switcher**:
   - Switch between **Citizen**, **Driver**, **Authority**, **NGO**, and **Admin** instantly with predefined accounts.

---

## 📦 Project Structure

```
pawalert/
├── client/                     # React + Vite Frontend
│   ├── src/
│   │   ├── components/         # GisMap, DriverAlertModal, AiClassifierModal, Navbar, QuickDemoBar
│   │   ├── pages/              # Landing, Citizen, Driver, Authority, Ngo, Admin, Login
│   │   ├── context/            # AuthContext with 1-click role switcher
│   │   ├── services/           # API fetch client & Web Audio synthesizer
│   │   ├── styles/             # index.css design system
│   │   └── App.jsx
│   └── package.json
│
├── server/                     # Node.js + Express Backend
│   ├── src/
│   │   ├── config/             # MongoDB connection & constants
│   │   ├── models/             # User, AccidentReport, Hotspot, AuthorityAction, RescueRequest
│   │   ├── services/           # dbscanService, hotspotService, geoService, aiService, duplicateService
│   │   ├── controllers/        # REST route controllers
│   │   ├── routes/             # Express API endpoints
│   │   ├── seed/               # seedData.js with 25+ clustered demo reports
│   │   ├── app.js
│   │   └── server.js
│   └── package.json
│
├── ai-service/                 # Python AI Microservice
│   ├── app.py                  # FastAPI server (/predict, /health, /model-info)
│   ├── inference/              # predict.py
│   ├── training/               # train.py (MobileNetV2 Transfer Learning)
│   ├── utils/                  # preprocessing.py
│   └── requirements.txt
│
└── README.md
```

---

## 🛠️ Quick Start & Installation

### Prerequisites
- Node.js (v18+)
- MongoDB (Running on `mongodb://127.0.0.1:27017`)
- Python 3.10+ (Optional for custom weights training)

### 1. Start Backend Server
```bash
cd server
npm install
npm run seed     # Seeds 25+ realistic accident reports, 5 users & runs DBSCAN
npm run dev      # Starts server on http://localhost:5000
```

### 2. Start Frontend Web Client
```bash
cd client
npm install
npm run dev      # Starts Vite client on http://localhost:5173
```

### 3. (Optional) Start Python AI Microservice
```bash
cd ai-service
pip install -r requirements.txt
python app.py    # Starts FastAPI on http://localhost:8000
```
*(Note: If Python is offline, the Node.js backend automatically runs in high-fidelity AI Demo Mode).*

---

## 🔑 Pre-Configured Demo Accounts (Password: `password123`)

| Role | Email | Purpose |
| :--- | :--- | :--- |
| **Citizen** | `citizen@pawalert.org` | Report accidents, scan photos, track status |
| **Driver** | `driver@pawalert.org` | Live GPS safety radar & siren alerts |
| **Authority** | `authority@pawalert.org` | Hotspot GIS maps, charts, municipal actions |
| **NGO** | `ngo@pawalert.org` | Rescue queue, ambulance dispatch, timeline |
| **Admin** | `admin@pawalert.org` | DBSCAN hyperparameter tuning & user access |

---

## 📊 Core API Endpoints

- `POST /api/ai/analyze-animal` — Upload photo and classify Dog / Cat / Cattle
- `POST /api/reports` — Submit new geo-tagged accident report
- `POST /api/reports/check-duplicate` — Check for existing reports within 120m
- `GET /api/hotspots` — Fetch all DBSCAN hotspot clusters and risk levels
- `POST /api/hotspots/recalculate` — Manually trigger DBSCAN clustering
- `POST /api/drivers/location` — Send driver GPS coordinates and receive proximity alerts
- `GET /api/rescue` — Fetch active NGO rescue requests
- `PATCH /api/rescue/:id/status` — Advance rescue timeline stage
- `GET /api/authority/actions` — List and update municipal safety actions
- `GET /api/analytics/overview` — Aggregate statistics and Recharts telemetry

---

## 🔮 Future Enhancements
- Automated Roadside CCTV Feed Processing
- Smart Traffic Light Slowdown Triggers
- IoT Acoustic Roadside Sensor Integration
- Native iOS / Android Mobile Apps (Flutter / React Native)
- Predictive Seasonal Accident Forecasting with Weather Data

---

## 📄 License
MIT © 2026 PawAlert AI Team
