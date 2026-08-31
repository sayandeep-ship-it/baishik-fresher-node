const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const { User, Role, UserRole } = require('../models');
const { sendOTP } = require('../services/emailService');

const generateOTP = () => crypto.randomInt(100000, 1000000).toString();

const getOTPExpiry = () => {
  const minutes = Number(process.env.OTP_EXPIRY_MINUTES || 10);
  return new Date(Date.now() + minutes * 60 * 1000);
};

const normalizeEmail = (email) => String(email).trim().toLowerCase();

const validatePassword = (password) => {
  return typeof password === 'string' && password.length >= 8;
};

const getRoleByName = async (name) => {
  return Role.findOne({ where: { name } });
};

const getUserRoleAssignments = async (userId) => {
  const assignments = await UserRole.findAll({
    where: { userId },
    include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }],
  });

  return assignments.map((assignment) => ({
    role: assignment.role.name,
    suspended: Boolean(assignment.suspended),
  }));
};

const getActiveRoleNames = async (userId) => {
  const assignments = await UserRole.findAll({
    where: { userId, suspended: false },
    include: [{ model: Role, as: 'role', attributes: ['name'] }],
  });

  return assignments.map((assignment) => assignment.role.name);
};

const sendVerificationOTPForUser = async (user) => {
  const otp = generateOTP();
  const otpExpiry = getOTPExpiry();

  user.otp = otp;
  user.otpExpiry = otpExpiry;
  await user.save();

  await sendOTP(user.email, otp, 'Verify Your Account');
};

// REGISTER / SIGNUP

exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body || {};

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

    const normalizedFirstName = String(firstName).trim();
    const normalizedLastName = String(lastName).trim();
    const normalizedEmail = normalizeEmail(email);

    const existingUser = await User.findOne({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      const assignments = await getUserRoleAssignments(existingUser.id);
      const hasUserRole = assignments.some((item) => item.role === 'user');
      const hasVendorRole = assignments.some((item) => item.role === 'vendor');

      if (hasUserRole) {
        return res.status(409).json({
          message: 'An account with this email already exists.',
        });
      }

      if (hasVendorRole) {
        const passwordMatches = await bcrypt.compare(password, existingUser.password);

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
      otp,
      otpExpiry,
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
      await sendOTP(normalizedEmail, otp, 'Verify Your Account');
    } catch (emailError) {
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

// SEND OTP

exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({
        message: 'Email is required.',
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({
      where: { email: normalizedEmail },
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

    await sendVerificationOTPForUser(user);

    return res.status(200).json({
      message: 'Verification OTP has been sent.',
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return res.status(500).json({
      message: 'Internal server error.',
    });
  }
};

// VERIFY EMAIL

exports.verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body || {};

    if (!email || !otp) {
      return res.status(400).json({
        message: 'Email and OTP are required.',
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({
      where: { email: normalizedEmail },
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

    return res.status(200).json({
      message: 'Email verified successfully.',
    });
  } catch (error) {
    console.error('Verify email error:', error);
    return res.status(500).json({
      message: 'Internal server error.',
    });
  }
};

// RESEND OTP

exports.resendOTP = async (req, res) => {
  return exports.sendOTP(req, res);
};
