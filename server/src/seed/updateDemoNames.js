const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const connectDB = require('../config/db');
const User = require('../models/User');
const AccidentReport = require('../models/AccidentReport');
const RescueRequest = require('../models/RescueRequest');
const AuthorityAction = require('../models/AuthorityAction');

async function updateNames() {
  await connectDB();
  console.log('🔄 Connected to MongoDB. Updating demo user names...');

  const updates = [
    { email: 'citizen@pawalert.demo', name: 'Karthik' },
    { email: 'driver@pawalert.demo', name: 'Alex' },
    { email: 'authority@pawalert.demo', name: 'Dr. Vikram Malhotra' },
    { email: 'ngo@pawalert.demo', name: 'PawsCare Animal Rescue League', organization: 'PawsCare Animal Welfare NGO' },
    { email: 'admin@pawalert.demo', name: 'Chief Admin' },

    { email: 'citizen@pawalert.org', name: 'Karthik (Org)' },
    { email: 'driver@pawalert.org', name: 'Alex (Org)' },
    { email: 'authority@pawalert.org', name: 'Dr. Vikram Malhotra (Org)' },
    { email: 'ngo@pawalert.org', name: 'PawsCare Animal Rescue League (Org)', organization: 'PawsCare Animal Welfare NGO' },
    { email: 'admin@pawalert.org', name: 'Chief Admin (Org)' },
  ];

  for (const u of updates) {
    const res = await User.updateOne(
      { email: u.email },
      { $set: { name: u.name, ...(u.organization ? { organization: u.organization } : {}) } }
    );
    console.log(`👤 Updated ${u.email} -> ${u.name} (Matched: ${res.matchedCount})`);
  }

  // Update associated records
  const rptRes = await AccidentReport.updateMany(
    { citizenName: 'Priya Sharma' },
    { $set: { citizenName: 'Karthik' } }
  );
  console.log(`📋 Updated accident reports citizenName -> Karthik (Modified: ${rptRes.modifiedCount})`);

  const rscRes = await RescueRequest.updateMany(
    { ngoName: { $in: ['Sneha Care Rescue Team', 'Sneha Care Rescue Team (Org)'] } },
    { $set: { ngoName: 'PawsCare Animal Rescue League' } }
  );
  console.log(`🐾 Updated rescue requests ngoName -> PawsCare (Modified: ${rscRes.modifiedCount})`);

  const actRes = await AuthorityAction.updateMany(
    { authorityName: { $in: ['Dr. Arul Raj', 'Dr. Arul Raj (Org)'] } },
    { $set: { authorityName: 'Dr. Vikram Malhotra' } }
  );
  console.log(`🏛️ Updated authority actions authorityName -> Dr. Vikram Malhotra (Modified: ${actRes.modifiedCount})`);

  console.log('✅ All demo names successfully updated across database collections!');
  process.exit(0);
}

updateNames().catch((err) => {
  console.error('❌ Update failed:', err);
  process.exit(1);
});
