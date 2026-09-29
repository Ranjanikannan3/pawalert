const http = require('http');

async function postJson(path, payload, token = null) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method: 'POST',
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function getJson(path, token = null) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method: 'GET',
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function runRoleSuite() {
  console.log('================================================================');
  console.log('🐾 PAWALERT AI — ROLE-BASED LOGIN & STRICT AUTHORIZATION TESTS');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(name, condition, detail = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`✅ [PASS] ${name} ${detail ? '(' + detail + ')' : ''}`);
    } else {
      console.error(`❌ [FAIL] ${name} ${detail ? '(' + detail + ')' : ''}`);
    }
  }

  // TEST 1: Citizen Login
  const citizenRes = await postJson('/api/auth/login', {
    email: 'citizen@pawalert.demo',
    password: 'Citizen@123',
    role: 'citizen',
  });
  assert(
    'Test 1: Citizen Login',
    citizenRes.status === 200 && citizenRes.data.user.role === 'citizen',
    `Status: ${citizenRes.status}, Role: ${citizenRes.data?.user?.role}`
  );

  // TEST 2: NGO Login
  const ngoRes = await postJson('/api/auth/login', {
    email: 'ngo@pawalert.demo',
    password: 'Ngo@123',
    role: 'ngo',
  });
  assert(
    'Test 2: NGO Login',
    ngoRes.status === 200 && ngoRes.data.user.role === 'ngo',
    `Status: ${ngoRes.status}, Role: ${ngoRes.data?.user?.role}`
  );

  // TEST 3: Authority Login
  const authRes = await postJson('/api/auth/login', {
    email: 'authority@pawalert.demo',
    password: 'Authority@123',
    role: 'authority',
  });
  assert(
    'Test 3: Authority Login',
    authRes.status === 200 && authRes.data.user.role === 'authority',
    `Status: ${authRes.status}, Role: ${authRes.data?.user?.role}`
  );

  // TEST 4: Driver Login
  const driverRes = await postJson('/api/auth/login', {
    email: 'driver@pawalert.demo',
    password: 'Driver@123',
    role: 'driver',
  });
  assert(
    'Test 4: Driver Login',
    driverRes.status === 200 && driverRes.data.user.role === 'driver',
    `Status: ${driverRes.status}, Role: ${driverRes.data?.user?.role}`
  );

  // TEST 5: Admin Login
  const adminRes = await postJson('/api/auth/login', {
    email: 'admin@pawalert.demo',
    password: 'Admin@123',
    role: 'admin',
  });
  assert(
    'Test 5: Admin Login',
    adminRes.status === 200 && adminRes.data.user.role === 'admin',
    `Status: ${adminRes.status}, Role: ${adminRes.data?.user?.role}`
  );

  // TEST 6: Role Mismatch Protection (Citizen selects Authority role)
  const mismatchRes = await postJson('/api/auth/login', {
    email: 'citizen@pawalert.demo',
    password: 'Citizen@123',
    role: 'authority',
  });
  assert(
    'Test 6: Role Mismatch Rejection',
    mismatchRes.status === 403 && mismatchRes.data.message.includes('not registered as an Authority'),
    `Status: ${mismatchRes.status}, Message: "${mismatchRes.data?.message}"`
  );

  // TEST 7: Wrong Password Rejection
  const wrongPassRes = await postJson('/api/auth/login', {
    email: 'citizen@pawalert.demo',
    password: 'WrongPassword_XYZ',
    role: 'citizen',
  });
  assert(
    'Test 7: Wrong Password Rejection',
    wrongPassRes.status === 401 && wrongPassRes.data.message === 'Invalid email or password',
    `Status: ${wrongPassRes.status}, Message: "${wrongPassRes.data?.message}"`
  );

  // TEST 8: Session Retrieval (/api/auth/me) with token
  const meRes = await getJson('/api/auth/me', citizenRes.data.token);
  assert(
    'Test 8: Current User Session (/api/auth/me)',
    meRes.status === 200 && meRes.data.user.email === 'citizen@pawalert.demo',
    `Email: ${meRes.data?.user?.email}, Role: ${meRes.data?.user?.role}`
  );

  // TEST 9: Strict API Authorization - Citizen token cannot access Authority-only action endpoints
  const authForbiddenRes = await postJson(
    '/api/authority/actions',
    { problem: 'Unauthorized action' },
    citizenRes.data.token
  );
  assert(
    'Test 9: Cross-Role API Protection (Citizen token on Authority endpoint)',
    authForbiddenRes.status === 403,
    `Status: ${authForbiddenRes.status}`
  );

  // TEST 10: Logout API
  const logoutRes = await postJson('/api/auth/logout', {});
  assert(
    'Test 10: Logout API',
    logoutRes.status === 200 && logoutRes.data.success === true,
    `Status: ${logoutRes.status}`
  );

  console.log('\n================================================================');
  console.log(`TOTAL RESULT: ${passed} / ${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('================================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runRoleSuite().catch((e) => {
  console.error('Test Suite Error:', e);
  process.exit(1);
});
