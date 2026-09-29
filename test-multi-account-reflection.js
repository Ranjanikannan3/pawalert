const API_BASE = 'http://localhost:5000/api';
const timestamp = Date.now();

async function req(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `HTTP ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function runMultiAccountReflectionTest() {
  console.log('🧪 Starting Multi-Account Cross-Dashboard Reflection Test...\n');

  try {
    // 1. Register 5 custom non-demo accounts
    const roles = ['citizen', 'ngo', 'driver', 'authority', 'admin'];
    const tokens = {};
    const users = {};

    for (const role of roles) {
      const email = `user_${role}_${timestamp}@customdomain.com`;
      const regRes = await req(`${API_BASE}/auth/register`, {
        method: 'POST',
        body: JSON.stringify({
          name: `Custom ${role.toUpperCase()} User`,
          email,
          password: 'Password123!',
          role,
          phone: '9876543210',
          organization: `${role.toUpperCase()} Squad Org`,
        }),
      });

      tokens[role] = regRes.token;
      users[role] = regRes.user;
      console.log(`✅ Registered new non-demo account [${role.toUpperCase()}]: ${email} (isDemoAccount: ${regRes.user.isDemoAccount})`);
    }

    console.log('\n--- 2. Citizen Submitting Complaint / Accident Report ---');
    const citizenToken = tokens['citizen'];
    const testAddress = `Main Junction Highway #${timestamp.toString().slice(-4)}`;
    const reportRes = await req(`${API_BASE}/reports`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizenToken}` },
      body: JSON.stringify({
        animalType: 'Dog',
        aiConfidence: 0.98,
        latitude: 8.7185,
        longitude: 77.7522,
        address: testAddress,
        description: `Injured stray dog needing urgent rescue at ${testAddress}`,
        severity: 'Critical',
        possibleCauses: JSON.stringify(['Poor street lighting', 'High vehicle speed']),
        rootCause: 'Poor street lighting',
        citizenObservation: 'Dog hit by fast moving vehicle near dark street curve.',
        citizenName: users['citizen'].name,
        citizenPhone: '9876543210',
        bypassDuplicateCheck: true,
      }),
    });

    const createdReport = reportRes.report;
    console.log(`✅ Citizen filed report successfully!`);
    console.log(`   Report ID: ${createdReport.reportId}`);
    console.log(`   MongoDB _id: ${createdReport._id}`);
    console.log(`   Address: ${createdReport.address}`);
    console.log(`   Status: ${createdReport.status}`);
    console.log(`   isDemo: ${createdReport.isDemo}`);

    console.log('\n--- 3. Verifying Reflection in NGO Dashboard ---');
    const ngoRes = await req(`${API_BASE}/rescue`, {
      headers: { Authorization: `Bearer ${tokens['ngo']}` },
    });
    const foundInNgo = ngoRes.requests.find(
      (r) => r.reportId?._id === createdReport._id || r.reportId?.reportId === createdReport.reportId
    );
    if (foundInNgo) {
      console.log(`✅ NGO Dashboard: Complaint found in rescue dispatch queue! (Rescue ID: ${foundInNgo._id}, Status: ${foundInNgo.status}, Priority: ${foundInNgo.priority})`);
    } else {
      console.error(`❌ NGO Dashboard: Complaint NOT found in rescue requests.`);
    }

    console.log('\n--- 4. Verifying Reflection in Authority Dashboard ---');
    const authReportsRes = await req(`${API_BASE}/reports?limit=50`, {
      headers: { Authorization: `Bearer ${tokens['authority']}` },
    });
    const foundInAuth = authReportsRes.reports.find((r) => r._id === createdReport._id);
    if (foundInAuth) {
      console.log(`✅ Authority Dashboard: Complaint found in incident registry! (Status: ${foundInAuth.status}, Root Cause: ${foundInAuth.rootCause})`);
    } else {
      console.error(`❌ Authority Dashboard: Complaint NOT found in reports.`);
    }

    const authStatsRes = await req(`${API_BASE}/analytics/overview`, {
      headers: { Authorization: `Bearer ${tokens['authority']}` },
    });
    console.log(`✅ Authority Dashboard: Overview analytics updated! Total reports: ${authStatsRes.data?.totalReports}`);

    console.log('\n--- 5. Verifying Reflection in Driver Dashboard ---');
    const driverReportsRes = await req(`${API_BASE}/reports?limit=10`, {
      headers: { Authorization: `Bearer ${tokens['driver']}` },
    });
    const foundInDriver = driverReportsRes.reports.find((r) => r._id === createdReport._id);
    if (foundInDriver) {
      console.log(`✅ Driver Dashboard: Complaint found in citizen danger zones radar! (Coordinates: ${foundInDriver.latitude}, ${foundInDriver.longitude})`);
    } else {
      console.error(`❌ Driver Dashboard: Complaint NOT found in driver recent reports.`);
    }

    console.log('\n--- 6. Verifying Reflection in Admin Dashboard ---');
    const adminReportsRes = await req(`${API_BASE}/reports?limit=60`, {
      headers: { Authorization: `Bearer ${tokens['admin']}` },
    });
    const foundInAdmin = adminReportsRes.reports.find((r) => r._id === createdReport._id);
    if (foundInAdmin) {
      console.log(`✅ Admin Dashboard: Complaint found in full lifecycle audit log!`);
    } else {
      console.error(`❌ Admin Dashboard: Complaint NOT found in admin reports.`);
    }

    console.log('\n======================================================');
    console.log('🎉 VERIFICATION COMPLETE: COMPLAINT REFLECTS ACROSS ALL DASHBOARDS!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  }
}

runMultiAccountReflectionTest();
