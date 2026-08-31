const jwt = require('jsonwebtoken');

const { User, Role, UserRole } = require('../models');

// AUTHENTICATION MIDDLEWARE

const authenticate = async (req, res, next) => {
  try {
    // 1. READ AUTHORIZATION HEADER

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: 'Authorization token is required.',
      });
    }

    // 2. CHECK BEARER FORMAT

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Authorization header must use Bearer token.',
      });
    }

    // 3. EXTRACT TOKEN

    const token = authHeader.substring(7);

    if (!token) {
      return res.status(401).json({
        message: 'Authorization token is required.',
      });
    }
    // SAVE ORIGINAL TOKEN
    req.token = token;
    // 4. VERIFY JWT

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({
        message: 'Invalid or expired token.',
      });
    }

    // 5. BASIC JWT VALIDATION

    if (!decoded.id || !Array.isArray(decoded.roles)) {
      return res.status(401).json({
        message: 'Invalid authentication token.',
      });
    }

    // 6. FIND USER

    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({
        message: 'User no longer exists.',
      });
    }

    // 7. CHECK ACCOUNT STATUS

    if (!user.isActive) {
      return res.status(403).json({
        message: 'Account is inactive.',
      });
    }

    // 8. LOAD ROLE ASSIGNMENTS

    const roleAssignments = await UserRole.findAll({
      where: {
        userId: user.id,
      },

      include: [
        {
          model: Role,

          as: 'role',

          attributes: ['id', 'name'],
        },
      ],
    });

    // 9. NO ROLE ASSIGNMENTS

    if (!roleAssignments.length) {
      return res.status(403).json({
        message: 'No role is assigned to this account.',
      });
    }

    // 10. BUILD CURRENT ROLE DATA

    const roleAssignmentsData = roleAssignments.map((assignment) => {
      return {
        id: assignment.role.id,

        name: assignment.role.name,

        suspended: Boolean(assignment.suspended),
      };
    });

    // 11. BUILD ACTIVE ROLES

    const activeRoles = roleAssignmentsData
      .filter((assignment) => !assignment.suspended)
      .map((assignment) => assignment.name);

    // 12. VERIFY JWT ROLE CONSISTENCY

    req.user = user;

    req.user.jwtRoles = decoded.roles;

    req.user.roles = activeRoles;

    req.user.roleAssignments = roleAssignmentsData;

    next();
  } catch (error) {
    console.error('Authentication error:', error);

    return res.status(401).json({
      message: 'Invalid or expired token.',
    });
  }
};

module.exports = authenticate;
