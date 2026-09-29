/**
 * Role-based authorization middleware
 * @param  {...string} roles Allowed roles (e.g., 'authority', 'ngo', 'admin')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (req.user.role === 'admin' || roles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      message: `User role '${req.user.role}' is not authorized to access this route`,
    });
  };
};

module.exports = {
  authorize,
  authorizeRole: authorize,
  authorizeRoles: authorize,
};
