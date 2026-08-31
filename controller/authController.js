const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { User, Role, UserRole } = require('../models');

const { sendOTP } = require('../services/emailService');

// GENERATE OTP

const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

// OTP EXPIRY

const getOTPExpiry = () => {
  const minutes = Number(process.env.OTP_EXPIRY_MINUTES || 10);

  return new Date(Date.now() + minutes * 60 * 1000);
};

// NORMALIZE EMAIL

const normalizeEmail = (email) => {
  return email.trim().toLowerCase();
};

// PASSWORD VALIDATION

const validatePassword = (password) => {
  return typeof password === 'string' && password.length >= 8;
};

// GET ROLE BY NAME

const getRoleByName = async (roleName) => {
  return await Role.findOne({
    where: {
      name: roleName,
    },
  });
};

// GET USER ROLE ASSIGNMENTS

const getUserRoleAssignments = async (userId) => {
  const assignments = await UserRole.findAll({
    where: {
      userId,
    },

    include: [
      {
        model: Role,

        as: 'role',

        attributes: ['id', 'name'],
      },
    ],
  });

  return assignments.map((assignment) => {
    return {
      role: assignment.role.name,

      suspended: assignment.suspended,
    };
  });
};

// Get active role names
//
// Only roles with:
//
// suspended = false
//
// are included.
//
// =====================================================

const getActiveRoleNames = async (userId) => {
  const assignments = await UserRole.findAll({
    where: {
      userId,

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

  return assignments.map((assignment) => assignment.role.name);
};

// CREATE ACCESS TOKEN

const createAccessToken = async (user) => {
  const roles = await getActiveRoleNames(user.id);

  return jwt.sign(
    {
      id: user.id,

      roles: roles,
    },

    process.env.JWT_SECRET,

    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    }
  );
};

// GET CURRENT LOGGED-IN USER
exports.me = async (req, res) => {
  try {
    // AUTHENTICATION CHECK
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required.',
      });
    }

    // USER ID
    const userId = req.user.id;
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    // CURRENT ROLE ASSIGNMENTS
    const roleAssignments = await UserRole.findAll({
      where: {
        userId: userId,
      },

      include: [
        {
          model: Role,

          as: 'role',

          attributes: ['id', 'name'],
        },
      ],
    });

    // Active roles

    const activeRoles = roleAssignments
      .filter((assignment) => !assignment.suspended)
      .map((assignment) => assignment.role.name);

    // Role assignments

    const roles = roleAssignments.map((assignment) => {
      return {
        id: assignment.role.id,

        name: assignment.role.name,

        suspended: Boolean(assignment.suspended),
      };
    });

    // JWT Token
    const token = req.token || null;

    // Response

    return res.status(200).json({
      success: true,

      message: 'Current user details fetched successfully.',

      token: token,

      user: {
        id: user.id,

        firstName: user.firstName,

        lastName: user.lastName,

        email: user.email,

        isActive: user.isActive,

        emailVerifiedAt: user.emailVerifiedAt,

        roles: activeRoles,

        roleAssignments: roles,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);

    return res.status(500).json({
      message: 'Internal server error.',
    });
  }
};

// Register normal user

exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        message: 'First name, last name, email and password are required.',
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        message: 'Password must contain at least 8 characters.',
      });
    }

    // Normalize values

    const normalizedFirstName = firstName.trim();

    const normalizedLastName = lastName.trim();

    const normalizedEmail = normalizeEmail(email);

    const existingUser = await User.findOne({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      const assignments = await getUserRoleAssignments(existingUser.id);

      const hasUserRole = assignments.some((assignment) => assignment.role === 'user');

      const hasVendorRole = assignments.some((assignment) => assignment.role === 'vendor');

      if (hasUserRole) {
        return res.status(409).json({
          message: 'An account with this email already exists.',
        });
      }

      if (hasVendorRole) {
        const passwordMatches = await bcrypt.compare(
          password,

          existingUser.password
        );

        if (!passwordMatches) {
          return res.status(401).json({
            message: 'An account already exists with this email. Use the existing account password.',
          });
        }

        const userRole = await getRoleByName('user');

        if (!userRole) {
          return res.status(500).json({
            message: 'User role is not configured.',
          });
        }

        const existingUserRole = await UserRole.findOne({
          where: {
            userId: existingUser.id,

            roleId: userRole.id,
          },
        });

        if (!existingUserRole) {
          await UserRole.create({
            userId: existingUser.id,

            roleId: userRole.id,

            suspended: false,

            assignedBy: null,

            assignedAt: new Date(),
          });
        } else if (existingUserRole.suspended) {
          existingUserRole.suspended = false;

          existingUserRole.suspendedAt = null;

          await existingUserRole.save();
        }

        return res.status(200).json({
          message: 'User role added successfully. You can use the same account as a customer and vendor.',
        });
      }

      return res.status(409).json({
        message: 'An account with this email already exists.',
      });
    }

    const userRole = await getRoleByName('user');

    if (!userRole) {
      return res.status(500).json({
        message: 'Default user role is not configured.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const otp = generateOTP();

    const otpExpiry = getOTPExpiry();

    const user = await User.create({
      firstName: normalizedFirstName,

      lastName: normalizedLastName,

      email: normalizedEmail,

      password: hashedPassword,

      isActive: false,

      emailVerifiedAt: null,

      // OTP stored directly
      otp: otp,

      otpExpiry: otpExpiry,

      passwordResetVersion: 0,
    });

    await UserRole.create({
      userId: user.id,

      roleId: userRole.id,

      suspended: false,

      assignedBy: null,

      assignedAt: new Date(),
    });

    try {
      await sendOTP(
        normalizedEmail,

        otp,

        'Verify Your Account'
      );
    } catch (emailError) {
      // User MUST remain in DB.

      console.error('Registration email error:', emailError);

      return res.status(201).json({
        message:
          'Account created successfully, but the verification email could not be sent. Please request a new OTP.',
      });
    }

    return res.status(201).json({
      message: 'Registration successful. Please verify your email using the OTP sent to your email.',
    });
  } catch (error) {
    console.error('Register error:', error);

    return res.status(500).json({
      message: 'Internal server error.',
    });
  }
};

// Verify otp

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp, otpPurpose } = req.body;

    // Validation

    if (!email || !otp || !otpPurpose) {
      return res.status(400).json({
        message: 'Email, OTP and otpPurpose are required.',
      });
    }

    const allowedPurposes = ['emailVerification', 'forgotPassword'];

    if (!allowedPurposes.includes(otpPurpose)) {
      return res.status(400).json({
        message: 'Invalid otpPurpose. Allowed values: emailVerification, forgotPassword.',
      });
    }

    const normalizedEmail = normalizeEmail(email);

    const user = await User.findOne({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    if (otpPurpose === 'emailVerification') {
      if (user.isActive) {
        return res.status(400).json({
          message: 'Account is already verified.',
        });
      }

      if (!user.otp || !user.otpExpiry) {
        return res.status(400).json({
          message: 'No active verification OTP found.',
        });
      }

      if (new Date() > user.otpExpiry) {
        return res.status(400).json({
          message: 'OTP has expired. Please request a new OTP.',
        });
      }

      if (String(user.otp) !== String(otp)) {
        return res.status(400).json({
          message: 'Invalid OTP.',
        });
      }

      user.isActive = true;

      user.emailVerifiedAt = new Date();

      user.otp = null;

      user.otpExpiry = null;

      await user.save();

      const roles = await getActiveRoleNames(user.id);

      const token = await createAccessToken(user);

      return res.status(200).json({
        message: 'Email verified successfully. Login successful.',

        token,

        user: {
          id: user.id,

          firstName: user.firstName,

          lastName: user.lastName,

          email: user.email,

          roles: roles,
        },
      });
    }

    if (otpPurpose === 'forgotPassword') {
      if (!user.isActive) {
        return res.status(403).json({
          message: 'Account is inactive. Please verify your email first.',
        });
      }

      if (!user.otp || !user.otpExpiry) {
        return res.status(400).json({
          message: 'No active password reset OTP found.',
        });
      }

      if (new Date() > user.otpExpiry) {
        return res.status(400).json({
          message: 'OTP has expired.',
        });
      }

      // Direct comparison
      if (String(user.otp) !== String(otp)) {
        return res.status(400).json({
          message: 'Invalid OTP.',
        });
      }

      // Consume OTP
      user.otp = null;

      user.otpExpiry = null;

      await user.save();

      const resetToken = jwt.sign(
        {
          id: user.id,

          purpose: 'password-reset',

          version: user.passwordResetVersion,
        },

        process.env.JWT_SECRET,

        {
          expiresIn: process.env.RESET_TOKEN_EXPIRES_IN || '10m',
        }
      );

      return res.status(200).json({
        message: 'OTP verified successfully. You may now reset your password.',

        resetToken,
      });
    }
  } catch (error) {
    console.error('Verify OTP error:', error);

    return res.status(500).json({
      message: 'Internal server error.',
    });
  }
};

// Resend registration otp

exports.resendVerificationOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: 'Email is required.',
      });
    }

    const normalizedEmail = normalizeEmail(email);

    const user = await User.findOne({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    if (user.isActive) {
      return res.status(400).json({
        message: 'Account is already verified.',
      });
    }

    const otp = generateOTP();

    const otpExpiry = getOTPExpiry();

    user.otp = otp;

    user.otpExpiry = otpExpiry;

    await user.save();

    await sendOTP(
      normalizedEmail,

      otp,

      'Your New Verification OTP'
    );

    return res.status(200).json({
      message: 'A new verification OTP has been sent.',
    });
  } catch (error) {
    console.error('Resend OTP error:', error);

    return res.status(500).json({
      message: 'Internal server error.',
    });
  }
};

// User login

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required.',
      });
    }

    const normalizedEmail = normalizeEmail(email);

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

    if (!user.isActive) {
      return res.status(403).json({
        message: 'Please verify your email before logging in.',
      });
    }

    const userRole = await getRoleByName('user');

    if (!userRole) {
      return res.status(500).json({
        message: 'User role is not configured.',
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
        message: 'Active user role is required.',
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,

      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }

    const roles = await getActiveRoleNames(user.id);

    const token = await createAccessToken(user);

    return res.status(200).json({
      message: 'Login successful.',

      token,

      user: {
        id: user.id,

        firstName: user.firstName,

        lastName: user.lastName,

        email: user.email,

        roles: roles,
      },
    });
  } catch (error) {
    console.error('User login error:', error);

    return res.status(500).json({
      message: 'Internal server error.',
    });
  }
};

// Superadmin login

exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required.',
      });
    }

    const normalizedEmail = normalizeEmail(email);

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

    if (!user.isActive) {
      return res.status(403).json({
        message: 'Account is inactive.',
      });
    }

    const superadminRole = await getRoleByName('superadmin');

    if (!superadminRole) {
      return res.status(500).json({
        message: 'Superadmin role is not configured.',
      });
    }

    const superadminAssignment = await UserRole.findOne({
      where: {
        userId: user.id,

        roleId: superadminRole.id,

        suspended: false,
      },
    });

    if (!superadminAssignment) {
      return res.status(403).json({
        message: 'Active superadmin role is required.',
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,

      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }

    const roles = await getActiveRoleNames(user.id);

    const token = await createAccessToken(user);

    return res.status(200).json({
      message: 'Superadmin login successful.',

      token,

      user: {
        id: user.id,

        firstName: user.firstName,

        lastName: user.lastName,

        email: user.email,

        roles: roles,
      },
    });
  } catch (error) {
    console.error('Superadmin login error:', error);

    return res.status(500).json({
      message: 'Internal server error.',
    });
  }
};

// User forgot password

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: 'Email is required.',
      });
    }

    const normalizedEmail = normalizeEmail(email);

    const user = await User.findOne({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: 'Account is inactive.',
      });
    }

    const userRole = await getRoleByName('user');

    if (!userRole) {
      return res.status(500).json({
        message: 'User role is not configured.',
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
        message: 'Active user role is required.',
      });
    }

    const otp = generateOTP();

    const otpExpiry = getOTPExpiry();

    user.otp = otp;

    user.otpExpiry = otpExpiry;

    await user.save();

    await sendOTP(
      normalizedEmail,

      otp,

      'Password Reset OTP'
    );

    return res.status(200).json({
      message: 'Password reset OTP has been sent to your email.',
    });
  } catch (error) {
    console.error('User forgot password error:', error);

    return res.status(500).json({
      message: 'Internal server error.',
    });
  }
};

// Reset password

exports.resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    // Validation

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        message: 'Reset token and new password are required.',
      });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        message: 'Password must contain at least 8 characters.',
      });
    }

    // Verify reset token

    let decoded;

    try {
      decoded = jwt.verify(
        resetToken,

        process.env.JWT_SECRET
      );
    } catch (error) {
      return res.status(401).json({
        message: 'Invalid or expired password reset token.',
      });
    }

    // Token purpose

    if (decoded.purpose !== 'password-reset') {
      return res.status(401).json({
        message: 'Invalid password reset token.',
      });
    }

    // Find user

    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    // Reset token version

    if (decoded.version !== user.passwordResetVersion) {
      return res.status(401).json({
        message: 'Password reset token is no longer valid.',
      });
    }

    // Hash new password

    const hashedPassword = await bcrypt.hash(
      newPassword,

      12
    );

    user.password = hashedPassword;

    user.passwordResetVersion += 1;

    await user.save();

    return res.status(200).json({
      message: 'Password reset successfully. You can now login.',
    });
  } catch (error) {
    console.error('Reset password error:', error);

    return res.status(500).json({
      message: 'Internal server error.',
    });
  }
};
