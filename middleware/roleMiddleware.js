const jwt = require('jsonwebtoken');
const { User, UserRole, Role } = require('../models');

// GENERIC ROLE AUTHORIZATION

const authorizeRoles = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      // AUTHENTICATION CHECK

      if (!req.user) {
        return res.status(401).json({
          message: 'Authentication required.',
        });
      }

      // FIND ACTIVE ROLE ASSIGNMENT

      const assignment = await UserRole.findOne({
        where: {
          userId: req.user.id,

          suspended: false,
        },

        include: [
          {
            model: Role,

            as: 'role',

            where: {
              name: allowedRoles,
            },

            attributes: ['id', 'name'],
          },
        ],
      });

      // NO ACTIVE ROLE

      if (!assignment) {
        // CHECK FOR SUSPENDED ROLE
        const suspendedAssignment = await UserRole.findOne({
          where: {
            userId: req.user.id,

            suspended: true,
          },

          include: [
            {
              model: Role,

              as: 'role',

              where: {
                name: allowedRoles,
              },

              attributes: ['id', 'name'],
            },
          ],
        });

        if (suspendedAssignment) {
          return res.status(403).json({
            message: 'Your role is suspended.',
          });
        }

        return res.status(403).json({
          message: 'You do not have permission to access this resource.',
        });
      }

      // AUTHORIZED

      req.authorizedRole = assignment.role.name;

      next();
    } catch (error) {
      console.error('Role authorization error:', error);

      return res.status(500).json({
        message: 'Internal server error.',
      });
    }
  };
};

// USER

const authorizeUser = authorizeRoles('user');

const notFoundResponse = () => ({
  message: 'Not found.',
});

// Authenticate a logged-in user for QR scan routes; return 404 for any failure.
const authenticateUserOr404 = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(404).json(notFoundResponse());
    }

    const token = authHeader.substring(7);

    if (!token) {
      return res.status(404).json(notFoundResponse());
    }

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(404).json(notFoundResponse());
    }

    if (!decoded.id || !Array.isArray(decoded.roles)) {
      return res.status(404).json(notFoundResponse());
    }

    const user = await User.findByPk(decoded.id);

    if (!user || !user.isActive) {
      return res.status(404).json(notFoundResponse());
    }

    const userRole = await Role.findOne({
      where: {
        name: 'user',
      },
    });

    if (!userRole) {
      return res.status(404).json(notFoundResponse());
    }

    const userAssignment = await UserRole.findOne({
      where: {
        userId: user.id,
        roleId: userRole.id,
        suspended: false,
      },
    });

    if (!userAssignment) {
      return res.status(404).json(notFoundResponse());
    }

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

    const roleAssignmentsData = roleAssignments.map((assignment) => ({
      id: assignment.role.id,
      name: assignment.role.name,
      suspended: Boolean(assignment.suspended),
    }));

    const activeRoles = roleAssignmentsData
      .filter((assignment) => !assignment.suspended)
      .map((assignment) => assignment.name);

    req.token = token;
    req.user = user;
    req.user.jwtRoles = decoded.roles;
    req.user.roles = activeRoles;
    req.user.roleAssignments = roleAssignmentsData;
    req.authorizedRole = 'user';

    next();
  } catch (error) {
    console.error('User scan authentication error:', error);
    return res.status(404).json(notFoundResponse());
  }
};

// VENDOR

const authorizeVendor = authorizeRoles('vendor');

// SUPERADMIN

const authorizeSuperadmin = authorizeRoles('superadmin');

module.exports = {
  authorizeRoles,
  authorizeUser,
  authenticateUserOr404,
  authorizeVendor,
  authorizeSuperadmin,
};
