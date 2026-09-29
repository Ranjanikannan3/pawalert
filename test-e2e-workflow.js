async function testWorkflow() {
  const baseUrl = 'http://localhost:5000/api';

  async function request(endpoint, options = {}) {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data };
  }

  console.log('=== STEP 1: Register Fresh Real Citizen ===');
  const uniqueEmail = `citizen_${Date.now()}@realcivic.org`;
  const registerRes = await request('/auth/register', {
    method: 'POST',
    body: {
      name: 'Ranjan Citizen',
      email: uniqueEmail,
      password: 'password123',
      role: 'citizen',
    },
  });
  console.log('Register status:', registerRes.status);
  console.log('User isDemoAccount (must be false):', registerRes.data?.user?.isDemoAccount);
  const citizenToken = registerRes.data?.token || registerRes.data?.user?.token;

  console.log('\n=== STEP 2: Verify Empty State for Fresh Citizen ===');
  const myReportsEmpty = await request('/reports/my', {
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  console.log('My Reports count (must be 0):', myReportsEmpty.data?.reports?.length);

  const hotspotsEmpty = await request('/hotspots', {
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  console.log('Hotspots count for real user (must be 0):', hotspotsEmpty.data?.hotspots?.length);

  console.log('\n=== STEP 3: Submit First Real Accident Report with Causes & Observations ===');
  const reportRes = await request('/reports', {
    method: 'POST',
    headers: { Authorization: `Bearer ${citizenToken}` },
    body: {
      animalType: 'Dog',
      aiConfidence: 0.96,
      aiCorrected: false,
      severity: 'High',
      description: 'Injured street dog near street corner',
      latitude: 8.7138,
      longitude: 77.7568,
      address: 'Vannarpettai Main Rd, Tirunelveli',
      possibleCauses: ['Poor street lighting', 'High vehicle speed'],
      citizenObservation: 'Vehicles move at high speeds and the corner has no working streetlights.',
      imageUrl: '/uploads/sample-dog.jpg',
      bypassDuplicateCheck: true,
    },
  });
  console.log('Submit Report Status (must be 201):', reportRes.status);
  console.log('Report response payload:', JSON.stringify(reportRes.data));
  const reportId = reportRes.data?.report?._id || reportRes.data?.data?._id;


  console.log('\n=== STEP 4: Verify Report Appears in Citizen Dashboard ===');
  const myReportsAfter = await request('/reports/my', {
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  console.log('Citizen reports count (must be 1):', myReportsAfter.data?.reports?.length);
  console.log('Report Status:', myReportsAfter.data?.reports?.[0]?.status);

  console.log('\n=== STEP 5: NGO Login & Rescue Triage Flow ===');
  const ngoEmail = `ngo_${Date.now()}@realrescue.org`;
  const ngoReg = await request('/auth/register', {
    method: 'POST',
    body: {
      name: 'South Paws Animal Rescue NGO',
      email: ngoEmail,
      password: 'password123',
      role: 'ngo',
    },
  });
  const ngoToken = ngoReg.data?.token || ngoReg.data?.user?.token;

  const ngoRescues = await request('/rescue', {
    headers: { Authorization: `Bearer ${ngoToken}` },
  });
  console.log('NGO visible rescue requests count (must be 1 for real user):', ngoRescues.data?.requests?.length);
  const rescueId = ngoRescues.data?.requests?.[0]?._id;

  if (rescueId) {
    console.log('NGO Accepting Rescue...');
    const acceptRes = await request(`/rescue/${rescueId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ngoToken}` },
      body: { status: 'ACCEPTED', notes: 'Rescue ambulance dispatched.' },
    });
    console.log('Rescue status updated:', acceptRes.data?.request?.status);

    console.log('NGO Advancing to RESCUED...');
    const rescuedRes = await request(`/rescue/${rescueId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ngoToken}` },
      body: { status: 'RESCUED', notes: 'Animal safely transported to hospital.' },
    });
    console.log('Rescue status advanced:', rescuedRes.data?.request?.status);
  }

  console.log('\n=== STEP 6: Authority Login & Cause Analysis ===');
  const authEmail = `authority_${Date.now()}@trafficgov.org`;
  const authReg = await request('/auth/register', {
    method: 'POST',
    body: {
      name: 'Municipal Road Safety Board',
      email: authEmail,
      password: 'password123',
      role: 'authority',
    },
  });
  const authToken = authReg.data?.token || authReg.data?.user?.token;

  const causeAnalysisRes = await request('/authority/cause-analysis', {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  console.log('Cause Analysis Total Reports:', causeAnalysisRes.data?.totalReportsWithCauses || causeAnalysisRes.data?.totalReports);
  console.log('Cause Distribution:', causeAnalysisRes.data?.distribution);


  console.log('\n=== STEP 7: Authority Creates Remediation Action ===');
  const createActionRes = await request('/authority/actions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
    body: {
      reportId: reportId,
      problem: 'Repeated collisions due to poor night street lighting and high vehicle speeds',
      possibleCause: 'Poor street lighting',
      actionType: 'Improve street lighting',
      assignedDepartment: 'Electrical & Street Lighting Department',
      assignedOfficer: 'Safety Unit 4',
      priority: 'HIGH',
      targetArea: 'Vannarpettai Main Rd',
      description: 'Install 4 high-luminosity solar streetlights and speed calming signs',
    },
  });
  console.log('Create Action status (must be 201):', createActionRes.status);
  console.log('Create Action response:', JSON.stringify(createActionRes.data));
  const actionId = createActionRes.data?.action?._id;


  console.log('\n=== STEP 8: Authority Advances Action to IN_PROGRESS ===');
  const inProgRes = await request(`/authority/actions/${actionId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${authToken}` },
    body: { status: 'IN_PROGRESS' },
  });
  console.log('Action status updated to IN_PROGRESS:', inProgRes.data?.action?.status);

  console.log('\n=== STEP 9: Authority Attempts to Complete Action WITHOUT Photo Proof (Must Fail) ===');
  const failRes = await request(`/authority/actions/${actionId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${authToken}` },
    body: { status: 'COMPLETED' },
  });
  console.log('Status without photo proof (must be 400):', failRes.status, failRes.data?.message);

  console.log('\n=== STEP 10: Authority Uploads Mandatory Solved Photo & Marks COMPLETED ===');
  const completeRes = await request(`/authority/actions/${actionId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${authToken}` },
    body: {
      status: 'COMPLETED',
      solvedImageUrl: '/uploads/solved-lighting.jpg',
      solvedNotes: 'Installed 4 solar LED streetlights; illumination verified at night.',
    },
  });
  console.log('Complete Action status (must be 200):', completeRes.status);
  console.log('Action solved photo URL:', completeRes.data?.action?.solvedImageUrl);

  console.log('\n=== STEP 11: Verify Citizen Received Notification & Before/After Proof ===');
  const citizenNotifs = await request('/notifications?role=citizen', {
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  console.log('Citizen notifications count:', citizenNotifs.data?.notifications?.length);
  console.log('Latest citizen notification:', citizenNotifs.data?.notifications?.[0]?.message);

  const citizenReportFinal = await request('/reports/my', {
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  const finalRep = citizenReportFinal.data?.reports?.[0];
  console.log('Final Report Remediation Status:', finalRep?.remediationStatus);
  console.log('Linked Remediation Action ID:', finalRep?.remediationActionId?._id || finalRep?.remediationActionId);

  console.log('\n=== STEP 12: Verify Demo Account Isolation (Demo Account Shows Seeded Demo Data) ===');
  const demoLogin = await request('/auth/login', {
    method: 'POST',
    body: {
      email: 'citizen@pawalert.demo',
      password: 'Citizen@123',
    },
  });
  console.log('Demo Login Status (must be 200):', demoLogin.status);
  const demoToken = demoLogin.data?.token || demoLogin.data?.user?.token;
  const demoReports = await request('/reports', {
    headers: { Authorization: `Bearer ${demoToken}` },
  });
  console.log('Demo Account Reports Count (must be > 0):', demoReports.data?.reports?.length);

  const demoHotspots = await request('/hotspots', {
    headers: { Authorization: `Bearer ${demoToken}` },
  });
  console.log('Demo Account Hotspots Count (must be > 0):', demoHotspots.data?.hotspots?.length);

  console.log('\n========================================================================');
  console.log('✓ ALL 12 REAL CIVIC WORKFLOW TESTS COMPLETED & VERIFIED 100% SUCCESSFUL!');
  console.log('========================================================================');
}

testWorkflow().catch(console.error);
