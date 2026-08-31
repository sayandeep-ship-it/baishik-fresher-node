const { UserRole, Role } = require('../models');

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
        // -----------------------------------------
        // Check whether the user has the role
        // but it is suspended.
        // -----------------------------------------

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

// VENDOR

const authorizeVendor = authorizeRoles('vendor');

// SUPERADMIN

const authorizeSuperadmin = authorizeRoles('superadmin');

module.exports = {
  authorizeRoles,
  authorizeUser,
  authorizeVendor,
  authorizeSuperadmin,
};
