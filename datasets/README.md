# 📊 PawAlert AI — Datasets Hub

Welcome to the official dataset repository for **PawAlert AI**. This directory hosts the spatial accident data and outlines how to attach external datasets for both **Computer Vision** and **GIS DBSCAN Hotspot Analysis**.

---

## 1. Spatial Accident & Roadkill Dataset

- **Files:**
  - `animal_roadkill_accidents.json` *(Primary ingestion format for MongoDB)*
  - `animal_roadkill_accidents.csv` *(Tabular format for QGIS, ArcGIS, Python Pandas)*

### Schema Definition:
| Field | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `reportId` | String | Unique accident incident identifier | `"RPT-DATASET-001"` |
| `animalType` | String | Animal species (`Dog`, `Cat`, `Cattle`) | `"Dog"` |
| `latitude` | Float | WGS84 decimal latitude | `8.7138` |
| `longitude` | Float | WGS84 decimal longitude | `77.7568` |
| `address` | String | Human-readable location / highway marker | `"South Bypass Highway Junction (KM 4.2)"` |
| `description` | String | Detailed accident description | `"Stray dog struck by car..."` |
| `possibleCauses` | Array | Road engineering / safety factors | `["High-speed zone", "Poor street lighting"]` |
| `severity` | String | Injury triage (`Critical`, `High`, `Moderate`, `Minor`) | `"Critical"` |
| `status` | String | Incident state in PawAlert pipeline | `"COMPLETED"` |
| `aiConfidence` | Float | Classifier probability score | `0.98` |
| `timestamp` | ISO String | Date & time of the incident | `"2026-03-01T18:45:00.000Z"` |

### How It Powers the Platform:
1. **DBSCAN Clustering Engine:** Evaluates spatial point density with an epsilon radius ($ε \approx 300\text{m}$) using the Haversine formula to identify high-density collision zones.
2. **Driver Safety Proximity HUD:** Triggers emergency warning chimes when vehicles enter within 350 meters of calculated cluster centroids.
3. **Municipality Remediation:** Allows municipal authorities to deploy street lights, animal crossing signs, and speed breakers directly onto identified accident clusters.

---

## 2. How to Ingest Datasets into MongoDB

Run the built-in ingestion command from the `server/` directory:

```bash
cd server
npm run import-dataset
```

Or run directly with Node.js:
```bash
node src/seed/importDataset.js
```

### Dry Run Mode:
To validate data without writing to MongoDB:
```bash
node src/seed/importDataset.js --dry-run
```

---

## 3. Connecting External Public Datasets

You can download and format data from these open sources to attach to PawAlert:

1. **GBIF / iNaturalist Roadkill Observations:**
   - URL: [https://www.gbif.org](https://www.gbif.org)
   - Filter by: `Basis of Record: Human Observation` + `Keyword: Roadkill`.
2. **California Roadkill Observation System (CROS):**
   - URL: [https://wildlifecrossing.net/california/](https://wildlifecrossing.net/california/)
   - Over 80,000+ geo-referenced animal accident reports with road attributes.
3. **OpenStreetMap (OSM) Speed Limits & Road Classes:**
   - Extract highway corridors and high-speed junctions via [Overpass Turbo](https://overpass-turbo.eu/).
