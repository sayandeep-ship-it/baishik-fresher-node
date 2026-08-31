const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");

const {
  User,
  Role,
  UserRole,
  VendorDetails,
  LoyaltyProgram,
  UserVendorEnrollment,
  UserLoyaltyEnrollment,
  LoyaltyProgramPin,
  LoyaltyScan,
  sequelize,
} = require("../models");

// HELPERS

const validatePassword = (password) => {
  return typeof password === "string" && password.length >= 8;
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

  return parts.join(", ");
};

const resolveStoreName = (vendor, vendorDetails) => {
  if (vendorDetails && vendorDetails.storeName) {
    return vendorDetails.storeName;
  }

  return [vendor.firstName, vendor.lastName].filter(Boolean).join(" ").trim();
};

const resolveCurrentStars = (enrollments) => {
  if (!enrollments || !enrollments.length) {
    return 0;
  }

  return Number(enrollments[0].starsCollected || 0);
};

const buildProgramDetails = (program) => {
  const existingDetails =
    program.details && typeof program.details === "object"
      ? program.details
      : {};

  const images = Array.isArray(existingDetails.images)
    ? existingDetails.images
    : program.image
      ? [program.image]
      : [];

  const rules =
    existingDetails.rules != null
      ? existingDetails.rules
      : program.programRules;

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
      name: "vendor",
    },
  });

  if (!vendorRole) {
    return {
      errorStatus: 500,

      errorMessage: "Vendor role is not configured.",
    };
  }

  const vendor = await User.findByPk(vendorId, {
    include: [
      {
        model: VendorDetails,

        as: "vendorDetails",
      },
    ],
  });

  if (!vendor || !vendor.isActive) {
    return {
      errorStatus: 404,

      errorMessage: "Store not found.",
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

      errorMessage: "Store not found.",
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

// USER LOGIN

const jwt = require("jsonwebtoken");

const getActiveRoleNames = async (userId) => {
  const assignments = await UserRole.findAll({
    where: { userId, suspended: false },
    include: [{ model: Role, as: "role", attributes: ["name"] }],
  });
  return assignments.map((assignment) => assignment.role.name);
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await User.findOne({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
      });
    }

    const userRole = await Role.findOne({
      where: { name: "user" },
    });

    if (!userRole) {
      return res.status(500).json({
        message: "User role is not configured.",
      });
    }

    const userAssignment = await UserRole.findOne({
      where: {
        userId: user.id,
        roleId: userRole.id,
        suspended: false,
      },
    });

    if (!userAssignment) {
      return res.status(403).json({
        message: "Active user role is required.",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const roles = await getActiveRoleNames(user.id);

    const token = jwt.sign(
      {
        id: user.id,
        roles,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1d",
      },
    );

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roles,
      },
    });
  } catch (error) {
    console.error("User login error:", error);
    return res.status(500).json({
      message: "Internal server error.",
    });
  }
};

// GET STORE LISTING

exports.getStores = async (req, res) => {
  try {
    const storeTypeFilter = req.query.storeType
      ? String(req.query.storeType).trim()
      : null;

    const vendorRole = await Role.findOne({
      where: {
        name: "vendor",
      },
    });

    if (!vendorRole) {
      return res.status(500).json({
        message: "Vendor role is not configured.",
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

          as: "user",

          required: true,

          where: {
            isActive: true,
          },

          include: [
            {
              model: VendorDetails,

              as: "vendorDetails",

              required: true,

              where: Object.keys(vendorDetailsWhere).length
                ? vendorDetailsWhere
                : undefined,
            },

            {
              model: UserVendorEnrollment,

              as: "storeEnrollments",

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

      return mapStoreCard(
        vendor,
        vendor.vendorDetails,
        vendor.storeEnrollments,
      );
    });

    return res.status(200).json({
      message: "Stores fetched successfully.",

      count: stores.length,

      stores,
    });
  } catch (error) {
    console.error("Get stores error:", error);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
};

// GET STORE + LOYALTY PROGRAMS

exports.getStoreById = async (req, res) => {
  try {
    const vendorId = Number(req.params.vendorId);

    if (!Number.isInteger(vendorId) || vendorId <= 0) {
      return res.status(400).json({
        message: "A valid store id is required.",
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
        isActive: true,
      },

      order: [["createdAt", "DESC"]],
    });

    const store = mapStoreCard(
      vendor,
      vendor.vendorDetails,
      enrollment ? [enrollment] : [],
    );

    return res.status(200).json({
      message: "Store fetched successfully.",

      store,

      loyaltyPrograms: loyaltyPrograms.map(mapProgramCard),
    });
  } catch (error) {
    console.error("Get store by id error:", error);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
};

// GET LOYALTY PROGRAM DETAILS

exports.getLoyaltyProgramDetails = async (req, res) => {
  try {
    const vendorId = Number(req.params.vendorId);

    const programId = Number(req.params.programId);

    if (
      !Number.isInteger(vendorId) ||
      vendorId <= 0 ||
      !Number.isInteger(programId) ||
      programId <= 0
    ) {
      return res.status(400).json({
        message: "A valid store id and program id are required.",
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
        isActive: true,
      },
    });

    if (!program) {
      return res.status(404).json({
        message: "Loyalty program not found.",
      });
    }

    const details = buildProgramDetails(program);

    return res.status(200).json({
      message: "Loyalty program fetched successfully.",

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
    console.error("Get loyalty program details error:", error);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
};

// ENROLL IN LOYALTY PROGRAM

exports.enrollLoyaltyProgram = async (req, res) => {
  try {
    const programId = Number(req.params.programId);

    if (!Number.isInteger(programId) || programId <= 0) {
      return res.status(400).json({
        message: "A valid loyalty program id is required.",
      });
    }

    const program = await LoyaltyProgram.findOne({
      where: {
        id: programId,
        isActive: true,
      },
    });

    if (!program) {
      return res.status(404).json({
        message: "Active loyalty program not found.",
      });
    }

    const vendorResult = await findActiveVendor(program.vendorId);

    if (vendorResult.errorStatus) {
      return res.status(vendorResult.errorStatus).json({
        message: vendorResult.errorMessage,
      });
    }

    const existingEnrollment = await UserLoyaltyEnrollment.findOne({
      where: {
        userId: req.user.id,
        loyaltyProgramId: program.id,
      },
    });

    if (existingEnrollment) {
      return res.status(409).json({
        message: "You are already enrolled in this loyalty program.",
        enrollment: existingEnrollment,
      });
    }

    const enrollment = await UserLoyaltyEnrollment.create({
      userId: req.user.id,
      loyaltyProgramId: program.id,
      starsCollected: 0,
      pendingStars: 0,
      redeemedStars: 0,
    });

    return res.status(201).json({
      success: true,
      message: "Loyalty program enrollment successful.",
      enrollment,
    });
  } catch (error) {
    console.error("Enroll loyalty program error:", error);
    return res.status(500).json({
      message: "Internal server error.",
    });
  }
};

// GET USER PROFILE

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,

      message: "User profile fetched successfully.",

      user: {
        id: user.id,

        firstName: user.firstName,

        lastName: user.lastName,

        email: user.email,

        roles: req.user.roles,
      },
    });
  } catch (error) {
    console.error("Get user profile error:", error);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
};

// UPDATE USER PROFILE

exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName } = req.body || {};

    if (firstName === undefined && lastName === undefined) {
      return res.status(400).json({
        message: "At least one of firstName or lastName is required.",
      });
    }

    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    if (firstName !== undefined) {
      const trimmedFirstName = String(firstName).trim();

      if (!trimmedFirstName) {
        return res.status(400).json({
          message: "First name cannot be empty.",
        });
      }

      user.firstName = trimmedFirstName;
    }

    if (lastName !== undefined) {
      const trimmedLastName = String(lastName).trim();

      if (!trimmedLastName) {
        return res.status(400).json({
          message: "Last name cannot be empty.",
        });
      }

      user.lastName = trimmedLastName;
    }

    await user.save();

    return res.status(200).json({
      success: true,

      message: "User profile updated successfully.",

      user: {
        id: user.id,

        firstName: user.firstName,

        lastName: user.lastName,

        email: user.email,

        roles: req.user.roles,
      },
    });
  } catch (error) {
    console.error("Update user profile error:", error);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
};

// CHANGE PASSWORD

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message:
          "Current password, new password and confirm password are required.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "New password and confirm password do not match.",
      });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters.",
      });
    }

    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const currentPasswordMatch = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!currentPasswordMatch) {
      return res.status(401).json({
        message: "Current password is incorrect.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    user.password = hashedPassword;

    await user.save();

    return res.status(200).json({
      success: true,

      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("User change password error:", error);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
};

// USER ME

exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User details fetched successfully.",
      token: req.token || null,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isActive: user.isActive,
        roles: req.user.roles,
        roleAssignments: req.user.roleAssignments,
      },
    });
  } catch (error) {
    console.error("Get user details error:", error);
    return res.status(500).json({
      message: "Internal server error.",
    });
  }
};

// =====================================================
// SCAN LOYALTY PROGRAM QR CODE
// =====================================================

const parseQrCodePayload = (qrCode) => {
  if (!qrCode || typeof qrCode !== "string") {
    return null;
  }

  const value = qrCode.trim();
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);
    if (parsed && parsed.type === "LOYALTY_PROGRAM" && parsed.token) {
      return String(parsed.token).trim();
    }
  } catch (error) {
    // Not JSON; continue with supported plain payload formats.
  }

  if (value.startsWith("LOYALTY_PROGRAM:")) {
    return value.substring("LOYALTY_PROGRAM:".length).trim();
  }

  return value;
};

const calculateIntervalMilliseconds = (value, unit) => {
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    return null;
  }

  const multipliers = {
    MINUTES: 60 * 1000,
    HOURS: 60 * 60 * 1000,
    DAYS: 24 * 60 * 60 * 1000,
  };

  return numberValue * multipliers[unit];
};

const getLastAwardedScan = async (
  userId,
  loyaltyProgramId,
  transaction = null,
) => {
  return LoyaltyScan.findOne({
    where: {
      userId,
      loyaltyProgramId,
      status: "AWARDED",
    },
    order: [["scannedAt", "DESC"]],
    transaction,
  });
};

const checkScanInterval = async (userId, program, transaction = null) => {
  const lastScan = await getLastAwardedScan(userId, program.id, transaction);

  if (!lastScan) {
    return {
      allowed: true,
      lastScan: null,
      retryAt: null,
    };
  }

  const intervalMs = calculateIntervalMilliseconds(
    program.qrCodeScanIntervalValue,
    program.qrCodeScanIntervalUnit,
  );

  if (!intervalMs) {
    return {
      allowed: false,
      error: "Loyalty program has an invalid QR scan interval configuration.",
    };
  }

  const lastScanTime = new Date(lastScan.scannedAt).getTime();
  const nextAllowedTime = lastScanTime + intervalMs;

  if (Date.now() < nextAllowedTime) {
    return {
      allowed: false,
      lastScan,
      retryAt: new Date(nextAllowedTime),
    };
  }

  return {
    allowed: true,
    lastScan,
    retryAt: null,
  };
};

// =====================================================
// SCAN QR CODE
// =====================================================

exports.scanLoyaltyQr = async (req, res) => {
  try {
    const { qrCode } = req.body || {};
    const qrCodeToken = parseQrCodePayload(qrCode);

    if (!qrCodeToken) {
      return res.status(400).json({
        message: "A valid loyalty program QR code is required.",
      });
    }

    const program = await LoyaltyProgram.findOne({
      where: {
        qrCodeToken,
        isActive: true,
      },
    });

    if (!program) {
      return res.status(404).json({
        message: "Active loyalty program not found for this QR code.",
      });
    }

    const vendorResult = await findActiveVendor(program.vendorId);
    if (vendorResult.errorStatus) {
      return res.status(vendorResult.errorStatus).json({
        message: vendorResult.errorMessage,
      });
    }

    // Enrollment is required before stars can be earned.
    const enrollment = await UserLoyaltyEnrollment.findOne({
      where: {
        userId: req.user.id,
        loyaltyProgramId: program.id,
      },
    });

    if (!enrollment) {
      return res.status(403).json({
        message:
          "You must enroll in this loyalty program before scanning its QR code.",
      });
    }

    const scanCheck = await checkScanInterval(req.user.id, program);

    if (!scanCheck.allowed) {
      if (scanCheck.error) {
        return res.status(500).json({
          message: scanCheck.error,
        });
      }

      return res.status(429).json({
        message: "You cannot collect another star yet.",
        nextAllowedAt: scanCheck.retryAt,
      });
    }

    const requiresPin = Boolean(
      program.hasPin || program.enablePinVerification,
    );

    if (requiresPin) {
      const scan = await LoyaltyScan.create({
        userId: req.user.id,
        loyaltyProgramId: program.id,
        status: "PENDING_PIN",
        starsAwarded: 0,
        pinVerified: false,
        scannedAt: new Date(),
        verifiedAt: null,
      });

      return res.status(200).json({
        success: true,
        starAwarded: false,
        requiresPin: true,
        scanId: scan.id,
        loyaltyProgramId: program.id,
        programName: program.programName,
        message:
          "QR code scanned successfully. Enter the PIN generated by the vendor to receive your star.",
      });
    }

    // No PIN required: award exactly one star atomically.
    const transaction = await sequelize.transaction();

    try {
      const lockedEnrollment = await UserLoyaltyEnrollment.findOne({
        where: {
          userId: req.user.id,
          loyaltyProgramId: program.id,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!lockedEnrollment) {
        await transaction.rollback();
        return res.status(403).json({
          message:
            "You must enroll in this loyalty program before collecting stars.",
        });
      }

      const lockedIntervalCheck = await checkScanInterval(
        req.user.id,
        program,
        transaction,
      );

      if (!lockedIntervalCheck.allowed) {
        await transaction.rollback();

        if (lockedIntervalCheck.retryAt) {
          return res.status(429).json({
            message: "You cannot collect another star yet.",
            nextAllowedAt: lockedIntervalCheck.retryAt,
          });
        }

        return res.status(500).json({
          message:
            lockedIntervalCheck.error || "Unable to validate QR scan interval.",
        });
      }

      lockedEnrollment.starsCollected += 1;
      lockedEnrollment.pendingStars += 1;
      await lockedEnrollment.save({ transaction });

      await LoyaltyScan.create(
        {
          userId: req.user.id,
          loyaltyProgramId: program.id,
          status: "AWARDED",
          starsAwarded: 1,
          pinVerified: false,
          scannedAt: new Date(),
          verifiedAt: null,
        },
        { transaction },
      );

      await transaction.commit();

      return res.status(200).json({
        success: true,
        starAwarded: true,
        requiresPin: false,
        starsAwarded: 1,
        pendingStars: lockedEnrollment.pendingStars,
        totalStarsCollected: lockedEnrollment.starsCollected,
        loyaltyProgramId: program.id,
        programName: program.programName,
        message:
          "QR code scanned successfully. One star has been added to your account.",
      });
    } catch (transactionError) {
      await transaction.rollback();
      throw transactionError;
    }
  } catch (error) {
    console.error("Scan loyalty QR error:", error);
    return res.status(500).json({
      message: "Internal server error.",
    });
  }
};

// =====================================================
// VERIFY VENDOR-GENERATED PIN
// =====================================================

exports.verifyLoyaltyPin = async (req, res) => {
  try {
    const { scanId, pin } = req.body || {};

    const numericScanId = Number(scanId);

    if (!Number.isInteger(numericScanId) || numericScanId <= 0) {
      return res.status(400).json({
        message: "A valid scanId is required.",
      });
    }

    if (!pin || !/^\d{6}$/.test(String(pin))) {
      return res.status(400).json({
        message: "A valid 6-digit PIN is required.",
      });
    }

    const pendingScan = await LoyaltyScan.findOne({
      where: {
        id: numericScanId,
        userId: req.user.id,
        status: "PENDING_PIN",
      },
    });

    if (!pendingScan) {
      return res.status(404).json({
        message: "Pending QR scan not found or it has already been completed.",
      });
    }

    const program = await LoyaltyProgram.findOne({
      where: {
        id: pendingScan.loyaltyProgramId,
        isActive: true,
      },
    });

    if (!program) {
      return res.status(404).json({
        message: "Active loyalty program not found.",
      });
    }

    if (!program.hasPin && !program.enablePinVerification) {
      return res.status(400).json({
        message: "PIN verification is not enabled for this loyalty program.",
      });
    }

    const enrollment = await UserLoyaltyEnrollment.findOne({
      where: {
        userId: req.user.id,
        loyaltyProgramId: program.id,
      },
    });

    if (!enrollment) {
      return res.status(403).json({
        message: "You must be enrolled in this loyalty program.",
      });
    }

    const pinExpiryMinutes = Number(
      process.env.LOYALTY_PIN_EXPIRY_MINUTES || 5,
    );
    const scanExpiresAt = new Date(
      new Date(pendingScan.scannedAt).getTime() + pinExpiryMinutes * 60 * 1000,
    );

    if (new Date() > scanExpiresAt) {
      pendingScan.status = "EXPIRED";
      await pendingScan.save();

      return res.status(410).json({
        message: "The QR scan has expired. Please scan the QR code again.",
      });
    }

    const transaction = await sequelize.transaction();

    try {
      const lockedScan = await LoyaltyScan.findOne({
        where: {
          id: numericScanId,
          userId: req.user.id,
          status: "PENDING_PIN",
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!lockedScan) {
        await transaction.rollback();
        return res.status(409).json({
          message:
            "This QR scan has already been completed or is no longer available.",
        });
      }

      const lockedEnrollment = await UserLoyaltyEnrollment.findOne({
        where: {
          userId: req.user.id,
          loyaltyProgramId: program.id,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!lockedEnrollment) {
        await transaction.rollback();
        return res.status(403).json({
          message: "You must be enrolled in this loyalty program.",
        });
      }

      const scanIntervalCheck = await checkScanInterval(
        req.user.id,
        program,
        transaction,
      );

      if (!scanIntervalCheck.allowed) {
        await transaction.rollback();

        if (scanIntervalCheck.retryAt) {
          return res.status(429).json({
            message: "You cannot collect another star yet.",
            nextAllowedAt: scanIntervalCheck.retryAt,
          });
        }

        return res.status(500).json({
          message:
            scanIntervalCheck.error || "Unable to validate QR scan interval.",
        });
      }

      const pinRecord = await LoyaltyProgramPin.findOne({
        where: {
          loyaltyProgramId: program.id,
          usedAt: null,
          revokedAt: null,
        },
        order: [["createdAt", "DESC"]],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!pinRecord) {
        await transaction.rollback();
        return res.status(400).json({
          message:
            "No active PIN is available. Ask the vendor to generate a new PIN.",
        });
      }

      if (new Date() > new Date(pinRecord.expiresAt)) {
        pinRecord.revokedAt = new Date();
        await pinRecord.save({ transaction });
        await transaction.commit();

        return res.status(410).json({
          message: "The PIN has expired. Ask the vendor to generate a new PIN.",
        });
      }

      const pinMatches = await bcrypt.compare(String(pin), pinRecord.pinHash);

      if (!pinMatches) {
        await transaction.rollback();
        return res.status(400).json({
          message: "Invalid PIN.",
        });
      }

      pinRecord.usedAt = new Date();
      await pinRecord.save({ transaction });

      lockedEnrollment.starsCollected += 1;
      lockedEnrollment.pendingStars += 1;
      await lockedEnrollment.save({ transaction });

      lockedScan.status = "AWARDED";
      lockedScan.starsAwarded = 1;
      lockedScan.pinVerified = true;
      lockedScan.verifiedAt = new Date();
      await lockedScan.save({ transaction });

      await transaction.commit();

      return res.status(200).json({
        success: true,
        starAwarded: true,
        starsAwarded: 1,
        pendingStars: lockedEnrollment.pendingStars,
        totalStarsCollected: lockedEnrollment.starsCollected,
        loyaltyProgramId: program.id,
        programName: program.programName,
        message:
          "PIN verified successfully. One star has been added to your account.",
      });
    } catch (transactionError) {
      await transaction.rollback();
      throw transactionError;
    }
  } catch (error) {
    console.error("Verify loyalty PIN error:", error);
    return res.status(500).json({
      message: "Internal server error.",
    });
  }
};
