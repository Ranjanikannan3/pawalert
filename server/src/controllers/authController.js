const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'pawalert_super_secret_jwt_key_2026_production_ready',
    { expiresIn: '30d' }
  );
};

const ROLE_DISPLAY_NAMES = {
  citizen: 'Citizen',
  ngo: 'NGO / Veterinary',
  authority: 'Authority',
  driver: 'Driver',
  admin: 'Admin',
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, organization } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email, and password' });
    }

    const assignedRole = (role || 'citizen').toLowerCase();

    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: assignedRole,
      phone: phone || '',
      organization: organization || '',
      isActive: true,
      isDemoAccount: false, // New registered users are NEVER demo accounts
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        organization: user.organization,
        isDemoAccount: false,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user, verify matching role & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Verify account active status
    if (user.isActive === false) {
      return res.status(403).json({
        message: 'Your account has been deactivated. Please contact the administrator.',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Role Verification: If a role is specified, verify actual database role matches
    if (role && role.toLowerCase() !== user.role.toLowerCase()) {
      const requestedRoleName = ROLE_DISPLAY_NAMES[role.toLowerCase()] || role;
      return res.status(403).json({
        message: `This account is not registered as an ${requestedRoleName} account.`,
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        organization: user.organization,
        isDemoAccount: Boolean(user.isDemoAccount),
        token,
      },
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      success: true,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        organization: user.organization,
        profileImage: user.profileImage,
        isDemoAccount: Boolean(user.isDemoAccount),
        createdAt: user.createdAt,
      },
    });
  } catch (error) {

    next(error);
  }
};

// @desc    Logout user / clear session
// @route   POST /api/auth/logout
// @access  Public
const logoutUser = async (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
};

// @desc    Quick 1-click Demo accounts for instant viva demonstration
// @route   GET /api/auth/demo-accounts
// @access  Public
const getDemoAccounts = async (req, res, next) => {
  try {
    const demoAccounts = [
      {
        role: 'citizen',
        email: 'citizen@pawalert.demo',
        fallbackEmail: 'citizen@pawalert.org',
        password: 'Citizen@123',
        fallbackPassword: 'password123',
        label: 'Citizen (Karthik)',
        desc: 'Report animal accidents and track rescue requests.',
        icon: 'User',
      },
      {
        role: 'driver',
        email: 'driver@pawalert.demo',
        fallbackEmail: 'driver@pawalert.org',
        password: 'Driver@123',
        fallbackPassword: 'password123',
        label: 'Driver (Alex)',
        desc: 'Receive alerts when approaching animal accident hotspots.',
        icon: 'Car',
      },
      {
        role: 'authority',
        email: 'authority@pawalert.demo',
        fallbackEmail: 'authority@pawalert.org',
        password: 'Authority@123',
        fallbackPassword: 'password123',
        label: 'Authority (Dr. Vikram Malhotra)',
        desc: 'Monitor accident reports and manage accident hotspots.',
        icon: 'Shield',
      },
      {
        role: 'ngo',
        email: 'ngo@pawalert.demo',
        fallbackEmail: 'ngo@pawalert.org',
        password: 'Ngo@123',
        fallbackPassword: 'password123',
        label: 'NGO / Veterinary (PawsCare Animal Rescue)',
        desc: 'Manage rescue requests and coordinate animal rescue.',
        icon: 'HeartHandshake',
      },
      {
        role: 'admin',
        email: 'admin@pawalert.demo',
        fallbackEmail: 'admin@pawalert.org',
        password: 'Admin@123',
        fallbackPassword: 'password123',
        label: 'Admin (Chief Admin)',
        desc: 'Manage users, reports, hotspots and the platform.',
        icon: 'Settings',
      },
    ];
    res.json({ success: true, accounts: demoAccounts });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  getDemoAccounts,
};
