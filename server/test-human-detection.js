const http = require('http');

function postJson(path, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Running Human & Incorrect Image Detection Tests on PawAlert AI Server...\n');

  // Test 1: Preset human sample
  console.log('Test 1: Preset human sample analysis');
  const res1 = await postJson('/api/ai/analyze-animal', { sampleType: 'human_sample' });
  console.log('Status:', res1.status);
  console.log('isAnimal:', res1.body.isAnimal);
  console.log('isHuman:', res1.body.isHuman);
  console.log('Message:', res1.body.message);
  console.log('Result Status:', res1.body.status);
  console.assert(res1.body.isAnimal === false, 'FAIL: Expected isAnimal === false');
  console.assert(res1.body.isHuman === true, 'FAIL: Expected isHuman === true');
  console.assert(res1.body.message.includes('Invalid Photo') || res1.body.message.includes('Not an Animal'), 'FAIL: Expected message to contain "Invalid Photo" or "Not an Animal"');
  console.log('✅ Test 1 PASSED!\n');

  // Test 2: Selfie / Person upload
  console.log('Test 2: Photo named selfie_of_person.jpg');
  const res2 = await postJson('/api/ai/analyze-animal', { sampleType: 'selfie_of_person' });
  console.assert(res2.body.isAnimal === false, 'FAIL: Expected isAnimal === false');
  console.assert(res2.body.isHuman === true, 'FAIL: Expected isHuman === true');
  console.assert(res2.body.message.includes('Invalid Photo') || res2.body.message.includes('Not an Animal'), 'FAIL: Expected message to contain "Invalid Photo" or "Not an Animal"');
  console.log('Message:', res2.body.message);
  console.log('✅ Test 2 PASSED!\n');

  // Test 3: Car / Non-animal test
  console.log('Test 3: Non-animal object (car_vehicle.jpg)');
  const res3 = await postJson('/api/ai/analyze-animal', { sampleType: 'car_vehicle' });
  console.assert(res3.body.isAnimal === false, 'FAIL: Expected isAnimal === false');
  console.assert(res3.body.isHuman === false, 'FAIL: Expected isHuman === false');
  console.assert(res3.body.message.includes('Invalid Photo') || res3.body.message.includes('Not an Animal'), 'FAIL: Expected message to contain "Invalid Photo" or "Not an Animal"');
  console.log('Message:', res3.body.message);
  console.log('✅ Test 3 PASSED!\n');

  // Test 4: Valid animal image (Dog)
  console.log('Test 4: Valid stray dog photo');
  const res4 = await postJson('/api/ai/analyze-animal', { sampleType: 'injured_dog_report' });
  console.assert(res4.body.isAnimal === true, 'FAIL: Expected isAnimal === true');
  console.assert(res4.body.animal === 'Dog', 'FAIL: Expected animal === Dog');
  console.log('Animal:', res4.body.animal, 'Confidence:', res4.body.confidence);
  console.log('✅ Test 4 PASSED!\n');

  // Test 5: Attempting to submit an accident report with a human photo
  console.log('Test 5: Attempt to submit report with human photo to /api/reports');
  const res5 = await postJson('/api/reports', {
    animalType: 'Human',
    sampleType: 'human_face.jpg',
    latitude: 8.7138,
    longitude: 77.7568,
    description: 'Human picture submitted by mistake',
  });
  console.log('Status code:', res5.status);
  console.log('Error message:', res5.body.message);
  console.assert(res5.status === 400, 'FAIL: Expected HTTP 400 Bad Request');
  console.assert(res5.body.message.includes('Invalid Photo') || res5.body.message.includes('Not an Animal') || res5.body.message.includes('Incorrect Image Detected'), 'FAIL: Expected 400 with invalid image message');
  console.log('✅ Test 5 PASSED!\n');

  // Test 6: Random things (smartphone, laptop)
  console.log('Test 6: Random thing (smartphone_desk.jpg)');
  const res6 = await postJson('/api/ai/analyze-animal', { sampleType: 'smartphone_desk', isAnimal: false, detectedLabel: 'Smartphone' });
  console.assert(res6.body.isAnimal === false, 'FAIL: Expected isAnimal === false');
  console.assert(res6.body.isHuman === false, 'FAIL: Expected isHuman === false');
  console.log('Message:', res6.body.message);
  console.log('✅ Test 6 PASSED!\n');

  console.log('🎉 ALL 6 HUMAN & NON-ANIMAL DETECTION TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
