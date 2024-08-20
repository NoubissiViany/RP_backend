const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid'); // Import uuid for generating secret key

// Generate a unique secret key (replace this with a more secure method in production)
const secretKey = uuidv4(); // This is a simple example, use a more robust method in production

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.status(401).json({ message: 'Unauthorized: No token provided' });

  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.status(403).json({ message: 'Unauthorized: Invalid token' });
    req.user = user; // Attach user data to the request object
    next();
  });
};

// Authorization middleware (checks for specific roles)
const authorizeRole = (role) => {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ message: `Unauthorized: Requires ${role} role` });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRole
};