const mongoose = require('mongoose');
const User = require('../models/User');
const AccidentReport = require('../models/AccidentReport');
const Hotspot = require('../models/Hotspot');
const AuthorityAction = require('../models/AuthorityAction');
const RescueRequest = require('../models/RescueRequest');
const Notification = require('../models/Notification');
const { recalculateHotspots } = require('../services/hotspotService');

// Base coordinates for the demo city zone (e.g. Tirunelveli / Metro Corridor)
// Center around Latitude: 8.7138, Longitude: 77.7568
const CLUSTERS = {
  // HIGH RISK CLUSTER (11 reports within ~300m) - South Bypass Highway Junction
  AREA_A_HIGH: [
    { lat: 8.7138, lng: 77.7568, animal: 'Dog', desc: 'Stray dog struck by car near Highway Junction turning.', sev: 'Critical' },
    { lat: 8.7141, lng: 77.7570, animal: 'Dog', desc: 'Injured puppy stranded on road median.', sev: 'Moderate' },
    { lat: 8.7136, lng: 77.7565, animal: 'Cattle', desc: 'Cow hit by speeding truck near bridge entrance.', sev: 'Critical' },
    { lat: 8.7139, lng: 77.7572, animal: 'Dog', desc: 'Dog limping with leg injury after vehicular impact.', sev: 'Moderate' },
    { lat: 8.7142, lng: 77.7567, animal: 'Cat', desc: 'Cat injured near petrol pump curb.', sev: 'Minor' },
    { lat: 8.7135, lng: 77.7569, animal: 'Cattle', desc: 'Stray bull sitting in blind curve after vehicle collision.', sev: 'High' },
    { lat: 8.7140, lng: 77.7564, animal: 'Dog', desc: 'Adult dog hit by two-wheeler during heavy rain.', sev: 'Moderate' },
    { lat: 8.7137, lng: 77.7574, animal: 'Dog', desc: 'Accident reported near tea stall intersection.', sev: 'Moderate' },
    { lat: 8.7144, lng: 77.7566, animal: 'Cattle', desc: 'Calf injured on roadway shoulder.', sev: 'Critical' },
    { lat: 8.7134, lng: 77.7571, animal: 'Dog', desc: 'Dog collided with auto-rickshaw.', sev: 'Minor' },
    { lat: 8.7138, lng: 77.7563, animal: 'Cat', desc: 'Cat hit near bypass signal.', sev: 'Minor' },
  ],

  // MEDIUM RISK CLUSTER (6 reports within ~250m) - Central Market & Bus Stand Corridor
  AREA_B_MEDIUM: [
    { lat: 8.7285, lng: 77.7380, animal: 'Dog', desc: 'Dog injured near central market gate.', sev: 'Moderate' },
    { lat: 8.7289, lng: 77.7384, animal: 'Cat', desc: 'Cat trapped near market loading bay after bike impact.', sev: 'Minor' },
    { lat: 8.7282, lng: 77.7378, animal: 'Cattle', desc: 'Cow hit by delivery van near vegetable market.', sev: 'Critical' },
    { lat: 8.7287, lng: 77.7382, animal: 'Dog', desc: 'Stray dog hit while crossing bus terminus entry.', sev: 'Moderate' },
    { lat: 8.7291, lng: 77.7381, animal: 'Dog', desc: 'Street dog with fractured paw near taxi stand.', sev: 'Moderate' },
    { lat: 8.7283, lng: 77.7386, animal: 'Cat', desc: 'Kitten rescued from roadside gutter after brush with vehicle.', sev: 'Minor' },
  ],

  // LOW RISK CLUSTER (3 reports within ~200m) - East Lake Ring Road
  AREA_C_LOW: [
    { lat: 8.7020, lng: 77.7710, animal: 'Dog', desc: 'Dog hit by bicycle/moped on lake promenade.', sev: 'Minor' },
    { lat: 8.7024, lng: 77.7713, animal: 'Cat', desc: 'Cat injured near park residential lane.', sev: 'Moderate' },
    { lat: 8.7018, lng: 77.7708, animal: 'Dog', desc: 'Stray dog brushed by four-wheeler.', sev: 'Minor' },
  ],

  // NOISE / ISOLATED OUTLIERS (Isolated reports with > 1.5km distance to test DBSCAN noise isolation)
  NOISE_POINTS: [
    { lat: 8.7450, lng: 77.7120, animal: 'Dog', desc: 'Isolated incident on North Industrial Highway.', sev: 'Moderate' },
    { lat: 8.6850, lng: 77.7950, animal: 'Cattle', desc: 'Single cow injury on rural farmland road.', sev: 'Critical' },
    { lat: 8.7300, lng: 77.7850, animal: 'Cat', desc: 'One-off cat incident near tech park entrance.', sev: 'Minor' },
  ],
};

const SAMPLE_USERS = [
  // 1. Official Demo Accounts (@pawalert.demo)
  {
    name: 'Karthik',
    email: 'citizen@pawalert.demo',
    password: 'Citizen@123',
    role: 'citizen',
    phone: '+91 98765 43210',
    organization: 'Civic Volunteer Reporter',
  },
  {
    name: 'Alex',
    email: 'driver@pawalert.demo',
    password: 'Driver@123',
    role: 'driver',
    phone: '+91 98765 43211',
    organization: 'City Transport & Logistics',
  },
  {
    name: 'Dr. Vikram Malhotra',
    email: 'authority@pawalert.demo',
    password: 'Authority@123',
    role: 'authority',
    phone: '+91 98765 43212',
    organization: 'Municipal Corporation Safety Division',
  },
  {
    name: 'PawsCare Animal Rescue League',
    email: 'ngo@pawalert.demo',
    password: 'Ngo@123',
    role: 'ngo',
    phone: '+91 98765 43213',
    organization: 'PawsCare Animal Welfare NGO',
  },
  {
    name: 'Chief Admin',
    email: 'admin@pawalert.demo',
    password: 'Admin@123',
    role: 'admin',
    phone: '+91 98765 43214',
    organization: 'PawAlert AI Core Operations',
  },

  // 2. Convenience Viva Accounts (@pawalert.org with password123)
  {
    name: 'Karthik (Org)',
    email: 'citizen@pawalert.org',
    password: 'password123',
    role: 'citizen',
    phone: '+91 98765 43210',
    organization: 'Civic Volunteer',
  },
  {
    name: 'Alex (Org)',
    email: 'driver@pawalert.org',
    password: 'password123',
    role: 'driver',
    phone: '+91 98765 43211',
    organization: 'City Transport & Logistics',
  },
  {
    name: 'Dr. Vikram Malhotra (Org)',
    email: 'authority@pawalert.org',
    password: 'password123',
    role: 'authority',
    phone: '+91 98765 43212',
    organization: 'Municipal Corporation Safety Division',
  },
  {
    name: 'PawsCare Animal Rescue League (Org)',
    email: 'ngo@pawalert.org',
    password: 'password123',
    role: 'ngo',
    phone: '+91 98765 43213',
    organization: 'PawsCare Animal Welfare NGO',
  },
  {
    name: 'Chief Admin (Org)',
    email: 'admin@pawalert.org',
    password: 'password123',
    role: 'admin',
    phone: '+91 98765 43214',
    organization: 'PawAlert AI Core Operations',
  },
];

const SAMPLE_IMAGES = {
  Dog: [
    'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=600&auto=format&fit=crop&q=80'
  ],
  Cat: [
    'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=600&auto=format&fit=crop&q=80'
  ],
  Cattle: [
    'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1546445317-29f4545e9d53?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1596733430284-f7437764b1a9?w=600&auto=format&fit=crop&q=80'
  ],
};

async function seedDatabase() {
  try {
    console.log('🌱 [Seed] Clearing existing demo data...');
    await User.deleteMany({});
    await AccidentReport.deleteMany({});
    await Hotspot.deleteMany({});
    await AuthorityAction.deleteMany({});
    await RescueRequest.deleteMany({});
    await Notification.deleteMany({});

    console.log('👤 [Seed] Creating sample user accounts for all 5 roles...');
    const createdUsers = {};
    for (const u of SAMPLE_USERS) {
      const passwordHash = await User.hashPassword(u.password);
      const userDoc = await User.create({
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
        phone: u.phone,
        organization: u.organization,
        isDemoAccount: true, // Demo accounts explicitly marked as demo
      });
      createdUsers[u.role] = userDoc;
    }

    console.log('📍 [Seed] Seeding 23 realistic accident reports in clustered zones...');
    const allReports = [];
    let reportCounter = 1;

    // Causes pool for realistic diversity
    const CAUSES_POOL = [
      ['Poor street lighting', 'High vehicle speed'],
      ['Garbage/food attracting animals', 'Poor road visibility'],
      ['High vehicle speed', 'Poor road visibility'],
      ['Animals frequently crossing this road', 'Poor street lighting'],
      ['Garbage/food attracting animals', 'Animals frequently crossing this road'],
      ['Road obstruction', 'Poor weather/visibility'],
      ['High vehicle speed', 'Heavy traffic/noise'],
      ['Poor street lighting', 'Vehicles parked near road'],
    ];

    const OBSERVATIONS_POOL = [
      'Many stray dogs cross near the curve. Vehicles travel very fast with minimal street lighting at night.',
      'Cattle frequently gather near the road edge because of open waste dumping. Speeding vehicles cannot brake in time.',
      'Streetlights have been out of order for 3 weeks, creating severe blind spots during evening rush hour.',
      'Animals cross between the market bins and the road. Vehicles park haphazardly reducing driver visibility.',
      'Blind corner near highway junction with no warning signboards or speed reducers.',
    ];

    // Combine all clusters
    const rawList = [
      ...CLUSTERS.AREA_A_HIGH.map((i) => ({ ...i, area: 'South Bypass Highway Junction' })),
      ...CLUSTERS.AREA_B_MEDIUM.map((i) => ({ ...i, area: 'Central Market & Bus Terminus' })),
      ...CLUSTERS.AREA_C_LOW.map((i) => ({ ...i, area: 'East Lake Promenade Ring Road' })),
      ...CLUSTERS.NOISE_POINTS.map((i) => ({ ...i, area: 'Outer Perimeter Corridor' })),
    ];

    for (const item of rawList) {
      const reportId = `PA-2026-${String(reportCounter).padStart(5, '0')}`;
      const imgs = SAMPLE_IMAGES[item.animal] || SAMPLE_IMAGES.Dog;
      const imageUrl = imgs[reportCounter % imgs.length];
      const possibleCauses = CAUSES_POOL[reportCounter % CAUSES_POOL.length];
      const citizenObservation = OBSERVATIONS_POOL[reportCounter % OBSERVATIONS_POOL.length];

      // Stagger creation dates across the past 30 days
      const daysAgo = Math.floor(Math.random() * 25);
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 - Math.random() * 3600000);

      const statusPool = ['PENDING', 'ACCEPTED', 'ON THE WAY', 'RESCUED', 'COMPLETED', 'RESOLVED'];
      const status = statusPool[reportCounter % statusPool.length];

      const report = await AccidentReport.create({
        reportId,
        citizenId: createdUsers.citizen._id,
        citizenName: createdUsers.citizen.name,
        citizenPhone: createdUsers.citizen.phone,
        imageUrl,
        animalType: item.animal,
        aiConfidence: parseFloat((0.92 + Math.random() * 0.07).toFixed(2)),
        latitude: item.lat,
        longitude: item.lng,
        address: `${item.area}, Sector ${(reportCounter % 5) + 1}`,
        description: item.desc,
        possibleCauses,
        citizenObservation,
        rootCause: possibleCauses[0],
        causeDescription: citizenObservation,
        severity: item.sev,
        status,
        remediationStatus: status === 'RESOLVED' || status === 'COMPLETED' ? 'COMPLETED' : status === 'ON THE WAY' ? 'IN_PROGRESS' : 'PENDING',
        isDemo: true,
        createdAt,
        updatedAt: createdAt,
      });

      allReports.push(report);

      // Create linked rescue request for active reports
      const rescue = await RescueRequest.create({
        reportId: report._id,
        ngoId: createdUsers.ngo._id,
        ngoName: createdUsers.ngo.name,
        assignedVolunteer: reportCounter % 2 === 0 ? 'Ravi Volunteer' : 'Deepa First Responder',
        volunteerPhone: '+91 94433 11223',
        priority: item.sev === 'Critical' ? 'Critical' : item.sev === 'Moderate' ? 'High' : 'Medium',
        status: status === 'RESOLVED' || status === 'COMPLETED' ? 'COMPLETED' : status === 'RESCUED' ? 'RESCUED' : status === 'ON THE WAY' ? 'ON THE WAY' : 'PENDING',
        medicalNotes: `Initial triage complete for ${item.animal}. Veterinary treatment coordinated.`,
        shelterLocation: 'PawCare Veterinary Hospital & Shelter',
        isDemo: true,
        createdAt,
        statusHistory: [
          { status: 'PENDING', updatedBy: 'Citizen Reporter', notes: 'Accident reported with photo and root cause details.', timestamp: createdAt },
          { status: 'ASSIGNED', updatedBy: 'PawsCare NGO Lead', notes: 'Dispatched rescue volunteer unit.', timestamp: new Date(createdAt.getTime() + 15 * 60000) },
        ],
      });

      reportCounter++;
    }

    console.log('🧠 [Seed] Running DBSCAN Hotspot Clustering on seeded coordinates...');
    const clusterResult = await recalculateHotspots({ isDemo: true });

    console.log('🛠️ [Seed] Creating sample authority remediation actions...');
    const hotspots = await Hotspot.find({ isDemo: true });
    if (hotspots.length > 0) {
      const highRiskHotspot = hotspots.find((h) => h.riskLevel === 'HIGH') || hotspots[0];
      const medRiskHotspot = hotspots.find((h) => h.riskLevel === 'MEDIUM') || hotspots[0];

      await AuthorityAction.create([
        {
          hotspotId: highRiskHotspot._id,
          authorityId: createdUsers.authority._id,
          authorityName: createdUsers.authority.name,
          problem: 'Repeated stray dog collisions near blind turn',
          possibleCause: 'High vehicle speed',
          actionType: 'Install warning signs',
          description: 'Erect high-visibility solar LED Animal Crossing signs on both sides of junction.',
          assignedDepartment: 'Traffic Safety & Signage Division',
          assignedOfficer: 'Officer Ramesh (Traffic Engineering)',
          priority: 'HIGH',
          status: 'IN_PROGRESS',
          isDemo: true,
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          notes: 'Contractor site inspection done. Foundation pillars being set.',
        },
        {
          hotspotId: highRiskHotspot._id,
          authorityId: createdUsers.authority._id,
          authorityName: createdUsers.authority.name,
          problem: 'Speeding vehicles hitting cattle during low visibility',
          possibleCause: 'High vehicle speed',
          actionType: 'Install speed breaker',
          description: 'Construct rumble strips and rubberized speed hump 100m before blind curve.',
          assignedDepartment: 'Civil Highways Infrastructure Wing',
          assignedOfficer: 'Highways Maintenance Wing',
          priority: 'HIGH',
          status: 'PENDING',
          isDemo: true,
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        },
        {
          hotspotId: medRiskHotspot._id,
          authorityId: createdUsers.authority._id,
          authorityName: createdUsers.authority.name,
          problem: 'Poor night visibility causing market animal accidents',
          possibleCause: 'Poor street lighting',
          actionType: 'Improve street lighting',
          description: 'Install 4 high-lumen solar LED floodlights around market curb and bus entrance.',
          assignedDepartment: 'Municipal Electrical Department',
          assignedOfficer: 'Electrical Division',
          priority: 'HIGH',
          status: 'COMPLETED',
          isDemo: true,
          completedDate: new Date(),
          solvedImageUrl: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=600&auto=format&fit=crop&q=80',
          solvedNotes: 'High-lumen LED lighting installed and verified at night. Road visibility enhanced by 85%.',
          notes: 'Lighting installed and verified at night. Solved photo proof uploaded.',
        },
      ]);
    }

    console.log('🔔 [Seed] Creating sample notifications...');
    await Notification.create([
      {
        recipientRole: 'all',
        type: 'HOTSPOT_CREATED',
        title: '🚨 High-Risk Hotspot Detected',
        message: 'DBSCAN cluster identified 11 repeated animal accidents at South Bypass Highway Junction.',
        isDemo: true,
      },
      {
        recipientRole: 'driver',
        type: 'DRIVER_ALERT',
        title: '⚠️ Speed Advisory Active',
        message: 'Drivers entering Sector 1 warning zone are advised to keep speed below 35 km/h.',
        isDemo: true,
      },
      {
        recipientRole: 'ngo',
        type: 'RESCUE_REQUESTED',
        title: '🐾 Critical Rescue Dispatched',
        message: 'Severe Cattle collision reported at South Bypass. Ambulance en route.',
        isDemo: true,
      },
    ]);


    console.log('✅ [Seed] Database seeded successfully with realistic demonstration data!');
    return true;
  } catch (error) {
    console.error('❌ [Seed] Seeding error:', error);
    return false;
  }
}

async function ensureUsersExist() {
  try {
    console.log('👤 [Auth] Ensuring standard login accounts exist...');
    for (const u of SAMPLE_USERS) {
      const existing = await User.findOne({ email: u.email.toLowerCase().trim() });
      if (!existing) {
        const passwordHash = await User.hashPassword(u.password);
        await User.create({
          name: u.name,
          email: u.email.toLowerCase().trim(),
          passwordHash,
          role: u.role,
          phone: u.phone,
          organization: u.organization,
          isDemoAccount: true,
          isActive: true,
        });
        console.log(`   + Created account: ${u.email} (${u.role})`);
      }
    }
    console.log('✅ Standard user accounts verified.');
  } catch (err) {
    console.error('❌ Error ensuring user accounts exist:', err.message);
  }
}

async function clearAllReports() {
  try {
    console.log('🧹 Clearing all sample and historical reports, rescues, hotspots, actions, and notifications...');
    const delReports = await AccidentReport.deleteMany({});
    const delHotspots = await Hotspot.deleteMany({});
    const delRescues = await RescueRequest.deleteMany({});
    const delActions = await AuthorityAction.deleteMany({});
    const delNotifs = await Notification.deleteMany({});

    console.log(`✅ Cleared:
      - Accident Reports: ${delReports.deletedCount}
      - Hotspots: ${delHotspots.deletedCount}
      - Rescue Requests: ${delRescues.deletedCount}
      - Authority Actions: ${delActions.deletedCount}
      - Notifications: ${delNotifs.deletedCount}`);
    return true;
  } catch (err) {
    console.error('❌ Error clearing reports data:', err.message);
    return false;
  }
}

async function autoSeedIfEmpty() {
  try {
    // Only ensure role login accounts exist so Citizen, NGO, Authority, Driver, Admin can log in.
    // Strictly DO NOT auto-seed sample reports - reports must only reflect what citizens upload!
    await ensureUsersExist();
  } catch (e) {
    console.error('Auto seed check error:', e.message);
  }
}

if (require.main === module) {
  require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
  const connectDB = require('../config/db');
  const args = process.argv.slice(2);

  connectDB().then(async () => {
    if (args.includes('--with-reports')) {
      await seedDatabase();
    } else {
      await clearAllReports();
      await ensureUsersExist();
    }
    process.exit(0);
  });
}

module.exports = {
  seedDatabase,
  autoSeedIfEmpty,
  ensureUsersExist,
  clearAllReports,
};

