const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const { Op } = require('sequelize');
const {
  sequelize,
  User,
  Role,
  UserRole,
  VendorDetails,
  LoyaltyProgram,
  UserVendorEnrollment,
  LoyaltyProgramPin,
  LoyaltyScan,
} = require('../models');
// HELPERS
const normalizeEmail = (email) => {
  return email.trim().toLowerCase();
};
// VENDOR LOGIN

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    // VALIDATION
    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required.',
      });
    }
    const normalizedEmail = normalizeEmail(email);
    // FIND USER
    const user = await User.findOne({
      where: {
        email: normalizedEmail,
      },
    });
    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }
    // ACCOUNT STATUS
    if (!user.isActive) {
      return res.status(403).json({
        message: 'Please verify your email before logging in.',
      });
    }
    // FIND VENDOR ROLE
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
    // FIND VENDOR ASSIGNMENT

    const vendorAssignment = await UserRole.findOne({
      where: {
        userId: user.id,
        roleId: vendorRole.id,
      },
    });
    // NOT A VENDOR
    if (!vendorAssignment) {
      return res.status(403).json({
        message: 'Vendor role is required.',
      });
    }
    // SUSPENDED VENDOR
    if (vendorAssignment.suspended) {
      return res.status(403).json({
        message: 'Vendor account is suspended.',
      });
    }
    // PASSWORD
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }
    // LOAD ACTIVE ROLES
    const roleAssignments = await UserRole.findAll({
      where: {
        userId: user.id,
        suspended: false,
      },
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['name'],
        },
      ],
    });
    const roles = roleAssignments.map((assignment) => assignment.role.name);
    // JWT
    const token = jwt.sign(
      {
        id: user.id,
        roles: roles,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '1d',
      }
    );
    // FIND VENDOR DETAILS
    let vendorDetails = await VendorDetails.findOne({
      where: {
        userId: user.id,
      },
    });
    // CREATE DEFAULT VENDOR DETAILS
    if (!vendorDetails) {
      vendorDetails = await VendorDetails.create({
        userId: user.id,
        hasAddress: false,
      });
    }
    // ADDRESS EXISTS
    if (vendorDetails.hasAddress) {
      return res.status(200).json({
        success: true,
        message: 'Vendor login successful.',
        token,
        requiresAddress: false,
        redirectTo: null,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          roles: roles,
        },
      });
    }
    // ADDRESS DOES NOT EXIST
    return res.status(200).json({
      success: true,
      message: 'Login successful. Please complete your vendor address details.',
      token,
      requiresAddress: true,
      redirectTo: '/vendor/address',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roles: roles,
      },
    });
  } catch (error) {
    console.error('Vendor login error:', error);
    return res.status(500).json({
      message: 'Internal server error.',
    });
  }
};
// SAVE / UPDATE VENDOR ADDRESS

exports.saveAddress = async (req, res) => {
  try {
    const { streetAddress, city, country, state, pinCode, storeName, storeType, image } = req.body;
    // VALIDATION
    if (!streetAddress || !city || !country || !state || !pinCode) {
      return res.status(400).json({
        message: 'Street address, city, country, state and pin code are required.',
      });
    }
    // USER ID FROM JWT
    const userId = req.user.id;
    // FIND VENDOR ROLE
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
    // ACTIVE VENDOR
    const vendorAssignment = await UserRole.findOne({
      where: {
        userId: userId,
        roleId: vendorRole.id,
        suspended: false,
      },
    });
    if (!vendorAssignment) {
      return res.status(403).json({
        message: 'Active vendor role is required.',
      });
    }
    // FIND EXISTING DETAILS
    let vendorDetails = await VendorDetails.findOne({
      where: {
        userId: userId,
      },
    });
    // CREATE
    if (!vendorDetails) {
      vendorDetails = await VendorDetails.create({
        userId: userId,
        hasAddress: true,
        streetAddress: streetAddress.trim(),
        city: city.trim(),
        country: country.trim(),
        state: state.trim(),
        pinCode: pinCode.trim(),
        storeName: storeName ? String(storeName).trim() : null,
        storeType: storeType ? String(storeType).trim() : null,
        image: image ? String(image).trim() : null,
      });
    } else {
      // UPDATE
      vendorDetails.streetAddress = streetAddress.trim();
      vendorDetails.city = city.trim();
      vendorDetails.country = country.trim();
      vendorDetails.state = state.trim();
      vendorDetails.pinCode = pinCode.trim();
      vendorDetails.hasAddress = true;
      if (storeName !== undefined) {
        vendorDetails.storeName = storeName ? String(storeName).trim() : null;
      }
      if (storeType !== undefined) {
        vendorDetails.storeType = storeType ? String(storeType).trim() : null;
      }
      if (image !== undefined) {
        vendorDetails.image = image ? String(image).trim() : null;
      }
      await vendorDetails.save();
    }
    // RESPONSE
    return res.status(200).json({
      success: true,
      message: 'Vendor address saved successfully.',
      vendorDetails: {
        hasAddress: vendorDetails.hasAddress,
        streetAddress: vendorDetails.streetAddress,
        city: vendorDetails.city,
        country: vendorDetails.country,
        state: vendorDetails.state,
        pinCode: vendorDetails.pinCode,
        storeName: vendorDetails.storeName,
        storeType: vendorDetails.storeType,
        image: vendorDetails.image,
      },
    });
  } catch (error) {
    console.error('Save vendor address error:', error);
    return res.status(500).json({
      message: 'Internal server error.',
    });
  }
};
// GET VENDOR ADDRESS

exports.getAddress = async (req, res) => {
  try {
    const vendorDetails = await VendorDetails.findOne({
      where: {
        userId: req.user.id,
      },
    });
    if (!vendorDetails) {
      return res.status(200).json({
        hasAddress: false,
        vendorDetails: null,
      });
    }
    return res.status(200).json({
      hasAddress: vendorDetails.hasAddress,
      vendorDetails: {
        streetAddress: vendorDetails.streetAddress,
        city: vendorDetails.city,
        country: vendorDetails.country,
        state: vendorDetails.state,
        pinCode: vendorDetails.pinCode,
        storeName: vendorDetails.storeName,
        storeType: vendorDetails.storeType,
        image: vendorDetails.image,
      },
    });
  } catch (error) {
    console.error('Get vendor address error:', error);
    return res.status(500).json({
      message: 'Internal server error.',
    });
  }
};
// VENDOR CHANGE PASSWORD

exports.changeVendorPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    // VALIDATION
    if (!newPassword) {
      return res.status(400).json({
        message: 'New password is required.',
      });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({
        message: 'Password must contain at least 8 characters.',
      });
    }
    // USER ID FROM JWT
    const userId = req.user.id;
    // FIND USER
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }
    // ACCOUNT STATUS
    if (!user.isActive) {
      return res.status(403).json({
        message: 'Account is inactive.',
      });
    }
    // FIND VENDOR ROLE
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
    // ACTIVE VENDOR ASSIGNMENT
    const vendorAssignment = await UserRole.findOne({
      where: {
        userId: userId,
        roleId: vendorRole.id,
        suspended: false,
      },
    });
    if (!vendorAssignment) {
      return res.status(403).json({
        message: 'Active vendor role is required.',
      });
    }
    // HASH NEW PASSWORD
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    // SAVE
    user.password = hashedPassword;
    await user.save();
    // RESPONSE
    return res.status(200).json({
      success: true,
      message: 'Vendor password changed successfully.',
    });
  } catch (error) {
    console.error('Vendor change password error:', error);
    return res.status(500).json({
      message: 'Internal server error.',
    });
  }
};
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const parseIsoDateParts = (value) => {
  if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value)) {
    return null;
  }
  const [year, month, day] = value.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  if (utcDate.getUTCFullYear() !== year || utcDate.getUTCMonth() !== month - 1 || utcDate.getUTCDate() !== day) {
    return null;
  }
  return {
    year,
    month,
    day,
  };
};
const parseDashboardDateRange = (startDate, endDate) => {
  const hasStart = startDate !== undefined && startDate !== null && String(startDate).trim() !== '';
  const hasEnd = endDate !== undefined && endDate !== null && String(endDate).trim() !== '';
  if (!hasStart && !hasEnd) {
    return {
      startDate: null,
      endDate: null,
      createdAtFilter: null,
    };
  }
  if (!hasStart || !hasEnd) {
    return {
      error: 'Both startDate and endDate are required.',
    };
  }
  const startParts = parseIsoDateParts(String(startDate).trim());
  const endParts = parseIsoDateParts(String(endDate).trim());
  if (!startParts || !endParts) {
    return {
      error: 'startDate and endDate must be valid dates in YYYY-MM-DD format.',
    };
  }
  const rangeStart = new Date(Date.UTC(startParts.year, startParts.month - 1, startParts.day, 0, 0, 0, 0));
  const rangeEnd = new Date(Date.UTC(endParts.year, endParts.month - 1, endParts.day, 23, 59, 59, 999));
  if (rangeStart > rangeEnd) {
    return {
      error: 'startDate cannot be after endDate.',
    };
  }
  return {
    startDate: String(startDate).trim(),
    endDate: String(endDate).trim(),
    createdAtFilter: {
      [Op.between]: [rangeStart, rangeEnd],
    },
  };
};
const mapLoyaltyProgramCard = (program) => {
  return {
    id: program.id,
    image: program.image,
    programName: program.programName,
    requiredStars: program.requiredStarCollection,
    scanInterval: {
      value: program.qrCodeScanIntervalValue,
      unit: program.qrCodeScanIntervalUnit,
    },
    participated: 0,
    totalStars: 0,
    description: program.programRules,
    createdAt: program.createdAt,
  };
};
// VENDOR DASHBOARD
exports.getDashboard = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const dateRange = parseDashboardDateRange(req.query.startDate, req.query.endDate);
    if (dateRange.error) {
      return res.status(400).json({
        message: dateRange.error,
      });
    }
    const programWhere = {
      vendorId,
    };
    const enrollmentWhere = {
      vendorId,
    };
    if (dateRange.createdAtFilter) {
      programWhere.createdAt = dateRange.createdAtFilter;
      enrollmentWhere.createdAt = dateRange.createdAtFilter;
    }
    const [activeLoyaltyPrograms, totalCustomers, recentPrograms] = await Promise.all([
      LoyaltyProgram.count({
        where: programWhere,
      }),
      UserVendorEnrollment.count({
        where: enrollmentWhere,
      }),
      LoyaltyProgram.findAll({
        where: {
          vendorId,
        },
        order: [['createdAt', 'DESC']],
        limit: 5,
      }),
    ]);
    return res.status(200).json({
      success: true,
      message: 'Vendor dashboard fetched successfully',
      dateRange: {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
      summary: {
        activeLoyaltyPrograms,
        totalCustomers,
        rewardsRedeemed: 0,
        fraudAlerts: 0,
      },
      recentLoyaltyPrograms: recentPrograms.map(mapLoyaltyProgramCard),
    });
  } catch (error) {
    console.error('Get vendor dashboard error:', error);
    return res.status(500).json({
      message: 'Internal server error.',
    });
  }
};

// =====================================================
// VENDOR LOYALTY PROGRAMS
// =====================================================

const getPaginationParams = (req, defaultLimit = 10, maxLimit = 100) => {
  let page = Number(req.query.page);
  let limit = Number(req.query.limit);

  if (!Number.isInteger(page) || page < 1) page = 1;
  if (!Number.isInteger(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
};

const buildProgramSearchCondition = (search) => {
  const value = search ? String(search).trim() : '';

  if (!value) return {};

  return {
    [Op.or]: [{ programName: { [Op.like]: `%${value}%` } }, { programRules: { [Op.like]: `%${value}%` } }],
  };
};

const validateNotificationSettings = (body) => {
  const {
    notificationEnabled,
    notificationStarField,
    notificationConditionOperator,
    notificationComparisonOperator,
    notificationComparisonValue,
    notificationAction,
    notificationTemplate,
  } = body || {};

  const enabled = notificationEnabled === true || notificationEnabled === 'true';

  let values = {
    notificationEnabled: enabled,
    notificationStarField: null,
    notificationConditionOperator: null,
    notificationComparisonOperator: null,
    notificationComparisonValue: null,
    notificationAction: null,
    notificationTemplate: null,
  };

  if (!enabled) return { values };

  values.notificationStarField = notificationStarField ? String(notificationStarField).trim() : 'STAR_COUNT';

  const allowedConditionOperators = [
    'LESS_THAN',
    'GREATER_THAN',
    'EQUAL_TO',
    'LESS_THAN_OR_EQUAL',
    'GREATER_THAN_OR_EQUAL',
  ];

  const allowedComparisonOperators = [
    'EQUAL_TO',
    'NOT_EQUAL_TO',
    'LESS_THAN',
    'GREATER_THAN',
    'LESS_THAN_OR_EQUAL',
    'GREATER_THAN_OR_EQUAL',
  ];

  if (!notificationConditionOperator) {
    return {
      error: 'Notification condition operator is required when notifications are enabled.',
    };
  }

  values.notificationConditionOperator = String(notificationConditionOperator).toUpperCase();

  if (!allowedConditionOperators.includes(values.notificationConditionOperator)) {
    return { error: 'Invalid notification condition operator.' };
  }

  if (!notificationComparisonOperator) {
    return {
      error: 'Notification comparison operator is required when notifications are enabled.',
    };
  }

  values.notificationComparisonOperator = String(notificationComparisonOperator).toUpperCase();

  if (!allowedComparisonOperators.includes(values.notificationComparisonOperator)) {
    return { error: 'Invalid notification comparison operator.' };
  }

  if (
    notificationComparisonValue === undefined ||
    notificationComparisonValue === null ||
    notificationComparisonValue === ''
  ) {
    return {
      error: 'Notification comparison value is required when notifications are enabled.',
    };
  }

  const comparisonValue = Number(notificationComparisonValue);

  if (!Number.isInteger(comparisonValue) || comparisonValue < 0) {
    return {
      error: 'Notification comparison value must be a non-negative integer.',
    };
  }

  values.notificationComparisonValue = comparisonValue;

  if (!notificationAction) {
    return {
      error: 'Notification action is required when notifications are enabled.',
    };
  }

  if (!notificationTemplate) {
    return {
      error: 'Notification template is required when notifications are enabled.',
    };
  }

  values.notificationAction = String(notificationAction).trim();
  values.notificationTemplate = String(notificationTemplate).trim();

  return { values };
};

// CREATE LOYALTY PROGRAM
exports.createLoyaltyProgram = async (req, res) => {
  try {
    const {
      programName,
      requiredStarCollection,
      qrCodeScanIntervalValue,
      qrCodeScanIntervalUnit,
      programRules,
      enablePinVerification,
    } = req.body || {};

    const vendorId = req.user.id;

    if (!programName) {
      return res.status(400).json({ message: 'Program name is required' });
    }

    if (requiredStarCollection === undefined || requiredStarCollection === null || requiredStarCollection === '') {
      return res.status(400).json({ message: 'Required star collection is required' });
    }

    if (qrCodeScanIntervalValue === undefined || qrCodeScanIntervalValue === null || qrCodeScanIntervalValue === '') {
      return res.status(400).json({ message: 'QR code scan interval value is required' });
    }

    if (!qrCodeScanIntervalUnit) {
      return res.status(400).json({ message: 'QR code scan interval unit is required' });
    }

    const starCollection = Number(requiredStarCollection);
    const intervalValue = Number(qrCodeScanIntervalValue);

    if (!Number.isInteger(starCollection) || starCollection <= 0) {
      return res.status(400).json({
        message: 'Required star collection must be a positive integer',
      });
    }

    if (!Number.isInteger(intervalValue) || intervalValue <= 0) {
      return res.status(400).json({
        message: 'QR code scan interval value must be a positive integer',
      });
    }

    const intervalUnit = String(qrCodeScanIntervalUnit).toUpperCase();
    const allowedUnits = ['MINUTES', 'HOURS', 'DAYS'];

    if (!allowedUnits.includes(intervalUnit)) {
      return res.status(400).json({
        message: 'QR code scan interval unit must be MINUTES, HOURS or DAYS',
      });
    }

    let imagePath = null;
    if (req.file) {
      imagePath = `/uploads/loyalty/${req.file.filename}`;
    }

    const notificationResult = validateNotificationSettings(req.body);
    if (notificationResult.error) {
      return res.status(400).json({ message: notificationResult.error });
    }

    const n = notificationResult.values;

    // `hasPin` is the new field. Keep `enablePinVerification` as a
    // backward-compatible input/output alias for existing clients.
    let hasPin;
    if (req.body.hasPin !== undefined) {
      hasPin = req.body.hasPin === true || req.body.hasPin === 'true';
    } else {
      hasPin = enablePinVerification === true || enablePinVerification === 'true';
    }

    // Generate one unique QR token per loyalty program.
    const qrCodeToken = crypto.randomBytes(32).toString('hex');
    const qrPayload = JSON.stringify({
      type: 'LOYALTY_PROGRAM',
      token: qrCodeToken,
      hasPin,
    });
    const qrCodeImage = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'M',
      width: 320,
      margin: 2,
    });

    const loyaltyProgram = await LoyaltyProgram.create({
      vendorId,
      image: imagePath,
      programName: String(programName).trim(),
      requiredStarCollection: starCollection,
      qrCodeScanIntervalValue: intervalValue,
      qrCodeScanIntervalUnit: intervalUnit,
      programRules: programRules ? String(programRules).trim() : null,
      notificationEnabled: n.notificationEnabled,
      notificationStarField: n.notificationStarField,
      notificationConditionOperator: n.notificationConditionOperator,
      notificationComparisonOperator: n.notificationComparisonOperator,
      notificationComparisonValue: n.notificationComparisonValue,
      notificationAction: n.notificationAction,
      notificationTemplate: n.notificationTemplate,
      enablePinVerification: hasPin,
      hasPin,
      qrCodeToken,
      qrCodeImage,
      isActive: false,
    });

    return res.status(201).json({
      message: 'Loyalty program created successfully',
      loyaltyProgram,
    });
  } catch (error) {
    console.error('Create loyalty program error:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

// GET RECENT LOYALTY PROGRAMS
exports.getRecentLoyaltyPrograms = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { page, limit, offset } = getPaginationParams(req, 5, 50);
    const search = req.query.search || '';
    const searchCondition = buildProgramSearchCondition(search);

    const result = await LoyaltyProgram.findAndCountAll({
      where: { vendorId, ...searchCondition },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    const totalPages = Math.ceil(result.count / limit);

    return res.status(200).json({
      message: 'Recent loyalty programs fetched successfully',
      search: String(search).trim(),
      pagination: {
        page,
        limit,
        total: result.count,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      count: result.rows.length,
      loyaltyPrograms: result.rows,
    });
  } catch (error) {
    console.error('Get recent loyalty programs error:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

// GET ALL LOYALTY PROGRAMS
exports.getAllLoyaltyPrograms = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { page, limit, offset } = getPaginationParams(req, 10, 100);
    const search = req.query.search || '';
    const searchCondition = buildProgramSearchCondition(search);

    const result = await LoyaltyProgram.findAndCountAll({
      where: { vendorId, ...searchCondition },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    const totalPages = Math.ceil(result.count / limit);

    return res.status(200).json({
      message: 'Loyalty programs fetched successfully',
      search: String(search).trim(),
      pagination: {
        page,
        limit,
        total: result.count,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      count: result.rows.length,
      loyaltyPrograms: result.rows,
    });
  } catch (error) {
    console.error('Get all loyalty programs error:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

// ACTIVATE OWN LOYALTY PROGRAM
exports.activateLoyaltyProgram = async (req, res) => {
  try {
    const programId = Number(req.params.programId);
    if (!Number.isInteger(programId) || programId <= 0) {
      return res.status(400).json({ message: 'A valid loyalty program id is required.' });
    }

    const program = await LoyaltyProgram.findOne({
      where: { id: programId, vendorId: req.user.id },
    });

    if (!program) return res.status(404).json({ message: 'Loyalty program not found.' });

    if (program.isActive) return res.status(400).json({ message: 'Loyalty program is already active.' });

    program.isActive = true;
    await program.save();

    return res.status(200).json({
      message: 'Loyalty program activated successfully.',
      loyaltyProgram: program,
    });
  } catch (error) {
    console.error('Activate loyalty program error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// DEACTIVATE OWN LOYALTY PROGRAM
exports.deactivateLoyaltyProgram = async (req, res) => {
  try {
    const programId = Number(req.params.programId);
    if (!Number.isInteger(programId) || programId <= 0) {
      return res.status(400).json({ message: 'A valid loyalty program id is required.' });
    }

    const program = await LoyaltyProgram.findOne({
      where: { id: programId, vendorId: req.user.id },
    });

    if (!program) return res.status(404).json({ message: 'Loyalty program not found.' });

    if (!program.isActive) return res.status(400).json({ message: 'Loyalty program is already inactive.' });

    program.isActive = false;
    await program.save();

    return res.status(200).json({
      message: 'Loyalty program deactivated successfully.',
      loyaltyProgram: program,
    });
  } catch (error) {
    console.error('Deactivate loyalty program error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// =====================================================
// GENERATE ONE-TIME LOYALTY PIN
// =====================================================

exports.generateLoyaltyPin = async (req, res) => {
  try {
    const programId = Number(req.params.programId);

    if (!Number.isInteger(programId) || programId <= 0) {
      return res.status(400).json({
        message: 'A valid loyalty program id is required.',
      });
    }

    const program = await LoyaltyProgram.findOne({
      where: {
        id: programId,
        vendorId: req.user.id,
      },
    });

    if (!program) {
      return res.status(404).json({
        message: 'Loyalty program not found.',
      });
    }

    if (!program.isActive) {
      return res.status(400).json({
        message: 'Cannot generate a PIN for an inactive loyalty program.',
      });
    }

    if (!program.hasPin && !program.enablePinVerification) {
      return res.status(400).json({
        message: 'PIN verification is not enabled for this loyalty program.',
      });
    }

    const pin = crypto.randomInt(100, 1000).toString();
    const pinHash = await bcrypt.hash(pin, 10);

    const expiryMinutes = Number(process.env.LOYALTY_PIN_EXPIRY_MINUTES || 5);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Revoke every previous unused PIN for this program.
    await LoyaltyProgramPin.update(
      {
        revokedAt: new Date(),
      },
      {
        where: {
          loyaltyProgramId: program.id,
          usedAt: null,
          revokedAt: null,
        },
      }
    );

    await LoyaltyProgramPin.create({
      loyaltyProgramId: program.id,
      vendorId: req.user.id,
      pinHash,
      expiresAt,
      usedAt: null,
      revokedAt: null,
    });

    return res.status(201).json({
      success: true,
      message: 'Loyalty verification PIN generated successfully.',
      loyaltyProgramId: program.id,
      pin,
      expiresAt,
    });
  } catch (error) {
    console.error('Generate loyalty PIN error:', error);
    return res.status(500).json({
      message: 'Internal server error.',
    });
  }
};

// =====================================================
// VENDOR PROFILE / ME
// =====================================================

exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: 'Vendor not found.',
      });
    }

    return res.status(200).json({
      success: true,

      message: 'Vendor details fetched successfully.',

      token: req.token || null,

      vendor: {
        id: user.id,

        firstName: user.firstName,

        lastName: user.lastName,

        email: user.email,

        isActive: user.isActive,

        roles: req.user.roles,
      },
    });
  } catch (error) {
    console.error('Get vendor details error:', error);

    return res.status(500).json({
      message: 'Internal server error.',
    });
  }
};

// GET VENDOR PROFILE
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: 'Vendor not found.',
      });
    }

    const vendorDetails = await VendorDetails.findOne({
      where: {
        userId: req.user.id,
      },
    });

    return res.status(200).json({
      success: true,

      message: 'Vendor profile fetched successfully.',

      token: req.token || null,

      vendor: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isActive: user.isActive,
        roles: req.user.roles,

        vendorDetails: vendorDetails
          ? {
              hasAddress: vendorDetails.hasAddress,
              streetAddress: vendorDetails.streetAddress,
              city: vendorDetails.city,
              country: vendorDetails.country,
              state: vendorDetails.state,
              pinCode: vendorDetails.pinCode,
              storeName: vendorDetails.storeName,
              storeType: vendorDetails.storeType,
              image: vendorDetails.image,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Get vendor profile error:', error);

    return res.status(500).json({
      message: 'Internal server error.',
    });
  }
};

// =====================================================
// UPDATE VENDOR BASIC INFORMATION
// =====================================================

exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName } = req.body || {};

    if (firstName === undefined && lastName === undefined) {
      return res.status(400).json({
        message: 'At least one of firstName or lastName is required.',
      });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'Vendor not found.' });

    if (firstName !== undefined) {
      const value = String(firstName).trim();
      if (!value) return res.status(400).json({ message: 'First name cannot be empty.' });
      user.firstName = value;
    }

    if (lastName !== undefined) {
      const value = String(lastName).trim();
      if (!value) return res.status(400).json({ message: 'Last name cannot be empty.' });
      user.lastName = value;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Vendor profile updated successfully.',
      vendor: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roles: req.user.roles,
      },
    });
  } catch (error) {
    console.error('Update vendor profile error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
