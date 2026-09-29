require('dotenv').config();
const mongoose = require('mongoose');
const AccidentReport = require('./src/models/AccidentReport');
const RescueRequest = require('./src/models/RescueRequest');
const { computeImageFingerprint, findVisualDuplicateAnimalReport, compareFingerprints } = require('./src/services/imageSimilarityService');
const { checkForDuplicateReport } = require('./src/services/duplicateService');
const { analyzeAnimalImage } = require('./src/services/aiService');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pawalert';

async function runTest() {
  console.log('🐾 [TEST] Starting AI Animal Photo Duplicate Detection Test...');

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB');

    // Clean up any test records
    await AccidentReport.deleteMany({ reportId: { $regex: /^TEST-DUP-/ } });
    await RescueRequest.deleteMany({ ngoName: 'Test Operations Squad' });

    // 1. Create Initial Incident Report with animal photo
    const report1Id = 'TEST-DUP-00001';
    const testImageUrl = '/uploads/sample-dog.jpg';
    const testSampleBuffer = Buffer.from('TEST_ANIMAL_DOG_PHOTO_BYTES_SAMPLE_UNIQUE_123456');

    const fp1 = computeImageFingerprint(testSampleBuffer, 'dog-incident-photo.jpg', testImageUrl);

    const report1 = await AccidentReport.create({
      reportId: report1Id,
      citizenName: 'Citizen Alice',
      citizenPhone: '+91 99999 11111',
      imageUrl: testImageUrl,
      animalType: 'Dog',
      aiConfidence: 0.97,
      latitude: 8.7138,
      longitude: 77.7568,
      address: 'South Bypass Highway, Sector 1',
      description: 'Injured stray dog seen near streetlight',
      possibleCauses: ['Poor street lighting', 'High vehicle speed'],
      rootCause: 'Poor street lighting',
      severity: 'High',
      status: 'PENDING',
      isDuplicate: false,
      imageHash: JSON.stringify(fp1),
      isDemo: true,
    });

    const rescue1 = await RescueRequest.create({
      reportId: report1._id,
      ngoName: 'Test Operations Squad',
      priority: 'High',
      status: 'PENDING',
      isDemo: true,
      statusHistory: [
        {
          status: 'PENDING',
          updatedBy: 'Citizen Alice',
          notes: 'Citizen submitted initial accident report.',
          timestamp: new Date(),
        },
      ],
    });

    console.log(`✓ Report 1 Created: ${report1.reportId} (ID: ${report1._id})`);

    // 2. Test Fingerprint comparison
    const fp2Same = computeImageFingerprint(testSampleBuffer, 'dog-incident-photo.jpg', testImageUrl);
    const similarityExact = compareFingerprints(fp1, fp2Same);
    console.log(`✓ Exact Image Fingerprint Similarity: ${similarityExact} (Expected: 1.0)`);
    if (similarityExact < 0.99) throw new Error('Expected similarity to be 1.0 for same image');

    // 3. Test AI visual duplicate analyzer directly
    const aiAnalysisResult = await analyzeAnimalImage(testSampleBuffer, 'dog-incident-photo.jpg', {
      latitude: 8.7140,
      longitude: 77.7570,
      imageUrl: testImageUrl,
      isDemo: true,
    });

    console.log('✓ AI Vision Analysis Result:', {
      animal: aiAnalysisResult.animal,
      confidence: aiAnalysisResult.confidence,
      isDuplicate: aiAnalysisResult.duplicateAnalysis?.isDuplicate,
      matchedReport: aiAnalysisResult.duplicateAnalysis?.matchingReport?.reportId,
      matchReason: aiAnalysisResult.duplicateAnalysis?.reason,
    });

    if (!aiAnalysisResult.duplicateAnalysis?.isDuplicate) {
      throw new Error('AI analysis failed to flag duplicate image from previous reports');
    }

    // 4. Test duplicateService checkForDuplicateReport
    const dupCheck = await checkForDuplicateReport(8.7140, 77.7570, 'Dog', true, {
      fileBuffer: testSampleBuffer,
      originalFilename: 'dog-incident-photo.jpg',
      imageUrl: testImageUrl,
    });

    console.log('✓ Duplicate Service Check:', {
      isDuplicate: dupCheck.isDuplicate,
      isImageDuplicate: dupCheck.isImageDuplicate,
      matchedId: dupCheck.existingReport?.reportId,
      similarityScore: dupCheck.similarityScore,
    });

    if (!dupCheck.isDuplicate) {
      throw new Error('checkForDuplicateReport failed to flag duplicate');
    }

    // 5. Simulate Report 2 Creation as DUPLICATE
    const report2Id = 'TEST-DUP-00002';
    const report2 = await AccidentReport.create({
      reportId: report2Id,
      citizenName: 'Citizen Bob',
      citizenPhone: '+91 99999 22222',
      imageUrl: testImageUrl,
      animalType: 'Dog',
      aiConfidence: 0.97,
      latitude: 8.7140,
      longitude: 77.7570,
      address: 'South Bypass Highway, Sector 1 (Near Signal)',
      description: 'Another citizen reporting the same injured dog at the same spot',
      possibleCauses: ['Poor street lighting'],
      rootCause: 'Poor street lighting',
      severity: 'High',
      status: 'DUPLICATE',
      isDuplicate: true,
      duplicateOf: report1._id,
      duplicateReportId: report1.reportId,
      duplicateReason: dupCheck.reason || 'AI visual match with previous animal accident report',
      duplicateConfidence: dupCheck.similarityScore || 0.98,
      imageHash: JSON.stringify(fp2Same),
      isDemo: true,
    });

    // Update Rescue 1 with linked duplicate note
    await RescueRequest.findOneAndUpdate(
      { reportId: report1._id },
      {
        $push: {
          statusHistory: {
            status: 'DUPLICATE_REPORT_LINKED',
            updatedBy: 'PawAlert AI Image Vision',
            notes: `Citizen Bob submitted matching animal photo (${report2.reportId}). Marked as duplicate and linked to this incident.`,
            timestamp: new Date(),
          },
        },
      }
    );

    // Create Rescue 2 as CANCELLED (no separate dispatch)
    const rescue2 = await RescueRequest.create({
      reportId: report2._id,
      ngoName: 'Test Operations Squad',
      priority: 'Low',
      status: 'CANCELLED',
      isDemo: true,
      statusHistory: [
        {
          status: 'CANCELLED',
          updatedBy: 'Citizen Bob',
          notes: `Report marked as DUPLICATE of accident ${report1.reportId} via AI animal photo analysis. Supporting evidence linked.`,
          timestamp: new Date(),
        },
      ],
    });

    console.log(`✓ Report 2 Created as DUPLICATE: ${report2.reportId}`);
    console.log('  - Status:', report2.status);
    console.log('  - isDuplicate:', report2.isDuplicate);
    console.log('  - duplicateOf:', report2.duplicateOf);
    console.log('  - duplicateReportId:', report2.duplicateReportId);
    console.log('  - duplicateReason:', report2.duplicateReason);

    // Verify populated query
    const populatedReport2 = await AccidentReport.findById(report2._id).populate('duplicateOf', 'reportId animalType imageUrl status');
    console.log('✓ Populated duplicateOf:', {
      linkedReportId: populatedReport2.duplicateOf?.reportId,
      linkedAnimalType: populatedReport2.duplicateOf?.animalType,
      linkedStatus: populatedReport2.duplicateOf?.status,
    });

    // Verify Rescue 1 has the duplicate note
    const updatedRescue1 = await RescueRequest.findOne({ reportId: report1._id });
    const hasLinkedNote = updatedRescue1.statusHistory.some((h) => h.status === 'DUPLICATE_REPORT_LINKED');
    console.log('✓ Rescue 1 Has Duplicate Linked Note in History:', hasLinkedNote);

    // Verify Rescue 2 is CANCELLED
    console.log('✓ Rescue 2 Status:', rescue2.status);

    // Clean up
    await AccidentReport.deleteMany({ reportId: { $regex: /^TEST-DUP-/ } });
    await RescueRequest.deleteMany({ ngoName: 'Test Operations Squad' });

    console.log('\n🎉 ALL TESTS PASSED! AI Animal Photo Duplicate Detection & Report Deduplication works correctly!\n');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTest();
