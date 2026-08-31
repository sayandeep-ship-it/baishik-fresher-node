const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

const { User, Role, UserRole, VendorDetails, LoyaltyProgram, UserVendorEnrollment } = require('../models');

// HELPERS

const validatePassword = (password) => {
  return typeof password === 'string' && password.length >= 8;
};

const formatLocation = (vendorDetails) => {
  if (!vendorDetails) {
    return null;
  }

  const parts = [
    vendorDetails.streetAddress,
    vendorDetails.city,
    vendorDetails.state,
    vendorDetails.country,
    vendorDetails.pinCode,
  ]
    .filter((part) => part && String(part).trim())
    .map((part) => String(part).trim());

  if (!parts.length) {
    return null;
  }

  return parts.join(', ');
};

const resolveStoreName = (vendor, vendorDetails) => {
  if (vendorDetails && vendorDetails.storeName) {
    return vendorDetails.storeName;
  }

  return [vendor.firstName, vendor.lastName].filter(Boolean).join(' ').trim();
};

const resolveCurrentStars = (enrollments) => {
  if (!enrollments || !enrollments.length) {
    return 0;
  }

  return Number(enrollments[0].starsCollected || 0);
};

const buildProgramDetails = (program) => {
  const existingDetails = program.details && typeof program.details === 'object' ? program.details : {};

  const images = Array.isArray(existingDetails.images) ? existingDetails.images : program.image ? [program.image] : [];

  const rules = existingDetails.rules != null ? existingDetails.rules : program.programRules;

  return {
    images,
    rules,
  };
};

const mapStoreCard = (vendor, vendorDetails, enrollments) => {
  return {
    vendorId: vendor.id,

    storeName: resolveStoreName(vendor, vendorDetails),

    storeType: vendorDetails ? vendorDetails.storeType : null,

    location: formatLocation(vendorDetails),

    image: vendorDetails ? vendorDetails.image : null,

    currentStars: resolveCurrentStars(enrollments),
  };
};

const mapProgramCard = (program) => {
  const details = buildProgramDetails(program);

  return {
    id: program.id,

    image: program.image || (details.images.length ? details.images[0] : null),

    programName: program.programName,

    requiredStarCollection: program.requiredStarCollection,

    programRules: program.programRules,
  };
};

const findActiveVendor = async (vendorId) => {
  const vendorRole = await Role.findOne({
    where: {
      name: 'vendor',
    },
  });

  if (!vendorRole) {
    return {
      errorStatus: 500,

      errorMessage: 'Vendor role is not configured.',
    };
  }

  const vendor = await User.findByPk(vendorId, {
    include: [
      {
        model: VendorDetails,

        as: 'vendorDetails',
      },
    ],
  });

  if (!vendor || !vendor.isActive) {
    return {
      errorStatus: 404,

      errorMessage: 'Store not found.',
    };
  }

  const vendorAssignment = await UserRole.findOne({
    where: {
      userId: vendor.id,

      roleId: vendorRole.id,

      suspended: false,
    },
  });

  if (!vendorAssignment) {
    return {
      errorStatus: 404,

      errorMessage: 'Store not found.',
    };
  }

  return {
    vendor,
  };
};

const getEnrollmentForUser = async (userId, vendorId) => {
  return await UserVendorEnrollment.findOne({
    where: {
      userId,
      vendorId,
    },
  });
};

// GET STORE LISTING

exports.getStores = async (req, res) => {
  try {
    const storeTypeFilter = req.query.storeType ? String(req.query.storeType).trim() : null;

    const vendorRole = await Role.findOne({
      where: {
        name: 'vendor',
      },
    });

    if (!vendorRole) {
      return res.status(500).json({
        message: 'Vendor role is not configured.',
      });
    }

    const vendorDetailsWhere = {};

    if (storeTypeFilter) {
      vendorDetailsWhere.storeType = {
        [Op.like]: storeTypeFilter,
      };
    }

    const vendorAssignments = await UserRole.findAll({
      where: {
        roleId: vendorRole.id,

        suspended: false,
      },

      include: [
        {
          model: User,

          as: 'user',

          required: true,

          where: {
            isActive: true,
          },

          include: [
            {
              model: VendorDetails,

              as: 'vendorDetails',

              required: true,

              where: Object.keys(vendorDetailsWhere).length ? vendorDetailsWhere : undefined,
            },

            {
              model: UserVendorEnrollment,

              as: 'storeEnrollments',

              required: false,

              where: {
                userId: req.user.id,
              },
            },
          ],
        },
      ],
    });

    const stores = vendorAssignments.map((assignment) => {
      const vendor = assignment.user;

      return mapStoreCard(vendor, vendor.vendorDetails, vendor.storeEnrollments);
    });

    return res.status(200).json({
      message: 'Stores fetched successfully.',

      count: stores.length,

      stores,
    });
  } catch (error) {
    console.error('Get stores error:', error);

    return res.status(500).json({
      message: 'Internal server error.',
    });
  }
};

// GET STORE + LOYALTY PROGRAMS

exports.getStoreById = async (req, res) => {
  try {
    const vendorId = Number(req.params.vendorId);

    if (!Number.isInteger(vendorId) || vendorId <= 0) {
      return res.status(400).json({
        message: 'A valid store id is required.',
      });
    }

    const vendorResult = await findActiveVendor(vendorId);

    if (vendorResult.errorStatus) {
      return res.status(vendorResult.errorStatus).json({
        message: vendorResult.errorMessage,
      });
    }

    const vendor = vendorResult.vendor;

    const enrollment = await getEnrollmentForUser(req.user.id, vendor.id);

    const loyaltyPrograms = await LoyaltyProgram.findAll({
      where: {
        vendorId: vendor.id,
      },

      order: [['createdAt', 'DESC']],
    });

    const store = mapStoreCard(vendor, vendor.vendorDetails, enrollment ? [enrollment] : []);

    return res.status(200).json({
      message: 'Store fetched successfully.',

      store,

      loyaltyPrograms: loyaltyPrograms.map(mapProgramCard),
    });
  } catch (error) {
    console.error('Get store by id error:', error);

    return res.status(500).json({
      message: 'Internal server error.',
    });
  }
};

// GET LOYALTY PROGRAM DETAILS

exports.getLoyaltyProgramDetails = async (req, res) => {
  try {
    const vendorId = Number(req.params.vendorId);

    const programId = Number(req.params.programId);

    if (!Number.isInteger(vendorId) || vendorId <= 0 || !Number.isInteger(programId) || programId <= 0) {
      return res.status(400).json({
        message: 'A valid store id and program id are required.',
      });
    }

    const vendorResult = await findActiveVendor(vendorId);

    if (vendorResult.errorStatus) {
      return res.status(vendorResult.errorStatus).json({
        message: vendorResult.errorMessage,
      });
    }

    const program = await LoyaltyProgram.findOne({
      where: {
        id: programId,

        vendorId: vendorId,
      },
    });

    if (!program) {
      return res.status(404).json({
        message: 'Loyalty program not found.',
      });
    }

    const details = buildProgramDetails(program);

    return res.status(200).json({
      message: 'Loyalty program fetched successfully.',

      loyaltyProgram: {
        id: program.id,

        vendorId: program.vendorId,

        programName: program.programName,

        requiredStarCollection: program.requiredStarCollection,

        image: program.image,

        programRules: program.programRules,

        details,
      },
    });
  } catch (error) {
    console.error('Get loyalty program details error:', error);

    return res.status(500).json({
      message: 'Internal server error.',
    });
  }
};

// GET USER PROFILE

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    return res.status(200).json({
      success: true,

      message: 'User profile fetched successfully.',

      user: {
        id: user.id,

        firstName: user.firstName,

        lastName: user.lastName,

        email: user.email,

        roles: req.user.roles,
      },
    });
  } catch (error) {
    console.error('Get user profile error:', error);

    return res.status(500).json({
      message: 'Internal server error.',
    });
  }
};

// UPDATE USER PROFILE

exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName } = req.body || {};

    if (firstName === undefined && lastName === undefined) {
      return res.status(400).json({
        message: 'At least one of firstName or lastName is required.',
      });
    }

    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    if (firstName !== undefined) {
      const trimmedFirstName = String(firstName).trim();

      if (!trimmedFirstName) {
        return res.status(400).json({
          message: 'First name cannot be empty.',
        });
      }

      user.firstName = trimmedFirstName;
    }

    if (lastName !== undefined) {
      const trimmedLastName = String(lastName).trim();

      if (!trimmedLastName) {
        return res.status(400).json({
          message: 'Last name cannot be empty.',
        });
      }

      user.lastName = trimmedLastName;
    }

    await user.save();

    return res.status(200).json({
      success: true,

      message: 'User profile updated successfully.',

      user: {
        id: user.id,

        firstName: user.firstName,

        lastName: user.lastName,

        email: user.email,

        roles: req.user.roles,
      },
    });
  } catch (error) {
    console.error('Update user profile error:', error);

    return res.status(500).json({
      message: 'Internal server error.',
    });
  }
};

// CHANGE PASSWORD

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message: 'Current password, new password and confirm password are required.',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: 'New password and confirm password do not match.',
      });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        message: 'Password must contain at least 8 characters.',
      });
    }

    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    const currentPasswordMatch = await bcrypt.compare(currentPassword, user.password);

    if (!currentPasswordMatch) {
      return res.status(401).json({
        message: 'Current password is incorrect.',
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    user.password = hashedPassword;

    await user.save();

    return res.status(200).json({
      success: true,

      message: 'Password changed successfully.',
    });
  } catch (error) {
    console.error('User change password error:', error);

    return res.status(500).json({
      message: 'Internal server error.',
    });
  }
};
