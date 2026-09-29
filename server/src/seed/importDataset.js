/**
 * 🐾 PawAlert AI — External Dataset Ingestion & DBSCAN Hotspot Generator
 * 
 * Usage:
 *   node src/seed/importDataset.js
 *   node src/seed/importDataset.js --file ../datasets/animal_roadkill_accidents.json
 *   node src/seed/importDataset.js --dry-run
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const connectDB = require('../config/db');
const AccidentReport = require('../models/AccidentReport');
const { recalculateHotspots } = require('../services/hotspotService');

async function runDatasetImporter() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const fileArgIndex = args.indexOf('--file');
  
  const defaultPath = path.resolve(__dirname, '../../../datasets/animal_roadkill_accidents.json');
  const filePath = fileArgIndex !== -1 && args[fileArgIndex + 1] ? path.resolve(args[fileArgIndex + 1]) : defaultPath;

  console.log('========================================================');
  console.log('🐾 PawAlert AI — Spatial Dataset Importer');
  console.log(`📁 Source File: ${filePath}`);
  console.log(`⚙️ Mode: ${isDryRun ? 'DRY RUN (Validation Only)' : 'LIVE IMPORT (Writing to MongoDB)'}`);
  console.log('========================================================');

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found at: ${filePath}`);
    process.exit(1);
  }

  let rawData;
  try {
    rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (!Array.isArray(rawData)) {
      throw new Error('Dataset JSON must contain an array of accident report objects.');
    }
  } catch (err) {
    console.error(`❌ JSON parsing error: ${err.message}`);
    process.exit(1);
  }

  console.log(`🔍 Validating ${rawData.length} records...`);

  const validRecords = [];
  const speciesCount = { Dog: 0, Cat: 0, Cattle: 0, Other: 0 };
  const severityCount = { Critical: 0, High: 0, Moderate: 0, Minor: 0 };

  for (let i = 0; i < rawData.length; i++) {
    const item = rawData[i];
    if (typeof item.latitude !== 'number' || typeof item.longitude !== 'number') {
      console.warn(`⚠️ Skipping row #${i + 1}: Invalid latitude or longitude.`);
      continue;
    }
    if (!item.animalType || !['Dog', 'Cat', 'Cattle', 'Other'].includes(item.animalType)) {
      item.animalType = 'Dog';
    }

    speciesCount[item.animalType] = (speciesCount[item.animalType] || 0) + 1;
    const sev = (item.severity && item.severity.charAt(0).toUpperCase() + item.severity.slice(1).toLowerCase()) || 'Moderate';
    severityCount[sev] = (severityCount[sev] || 0) + 1;

    validRecords.push({
      reportId: item.reportId || `RPT-IMP-${Date.now()}-${i}`,
      animalType: item.animalType,
      latitude: item.latitude,
      longitude: item.longitude,
      district: item.district || '',
      address: item.address || 'Geo-tagged roadside collision point',
      description: item.description || `Road accident involving ${item.animalType}`,
      possibleCauses: item.possibleCauses || ['High-speed zone', 'Poor street lighting'],
      citizenObservation: item.citizenObservation || '',
      severity: sev,
      status: item.status || 'COMPLETED',
      remediationStatus: item.remediationStatus || 'PENDING',
      aiConfidence: item.aiConfidence || 0.95,
      imageUrl: item.imageUrl || '/uploads/demo-dog-1.jpg',
      isDemo: true,
      createdAt: item.timestamp ? new Date(item.timestamp) : new Date(),
    });
  }

  console.log('\n📊 Dataset Summary:');
  console.log(` - Total Valid Records: ${validRecords.length}`);
  console.log(` - Species Breakdown: Dogs=${speciesCount.Dog}, Cats=${speciesCount.Cat}, Cattle=${speciesCount.Cattle}`);
  console.log(` - Severity Breakdown: Critical=${severityCount.Critical}, High=${severityCount.High}, Moderate=${severityCount.Moderate}, Minor=${severityCount.Minor}`);

  if (isDryRun) {
    console.log('\n✨ Dry run validation completed successfully. No changes made to database.');
    process.exit(0);
  }

  try {
    await connectDB();
    console.log('\n🔄 Connected to MongoDB. Ingesting records...');

    let inserted = 0;
    let updated = 0;

    for (const rec of validRecords) {
      const res = await AccidentReport.findOneAndUpdate(
        { reportId: rec.reportId },
        { $set: rec },
        { upsert: true, new: true, rawResult: true }
      );
      if (res.lastErrorObject && res.lastErrorObject.updatedExisting) {
        updated++;
      } else {
        inserted++;
      }
    }

    console.log(`✅ Records Ingested: ${inserted} inserted, ${updated} updated.`);

    console.log('\n🔄 Recalculating DBSCAN Spatial Hotspots on the attached dataset...');
    const result = await recalculateHotspots();
    const hotspotList = Array.isArray(result) ? result : (result.activeHotspots || []);
    console.log(`🎯 DBSCAN Completed! Generated ${hotspotList.length} active accident hotspots.`);
    if (result.noiseReports !== undefined) {
      console.log(`ℹ️ Noise / Outlier reports detected: ${result.noiseReports}`);
    }
    
    hotspotList.forEach((h, idx) => {
      const radius = h.radius || h.radiusMeters || 200;
      console.log(`   [${idx + 1}] Risk Level: ${h.riskLevel} | Reports: ${h.reportCount} | Radius: ${Math.round(radius)}m | Centroid: (${h.centerLatitude.toFixed(4)}, ${h.centerLongitude.toFixed(4)})`);
    });

    console.log('\n🚀 Dataset attached and active for Driver HUD & GIS Maps!');
    process.exit(0);
  } catch (err) {
    console.error(`❌ Ingestion failed: ${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  runDatasetImporter();
}

module.exports = { runDatasetImporter };
