const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { User, Role, UserRole } = require('../models');

const normalizeEmail = (email) => String(email).trim().toLowerCase();

const getActiveRoleNames = async (userId) => {
  const assignments = await UserRole.findAll({
    where: { userId, suspended: false },
    include: [{ model: Role, as: 'role', attributes: ['name'] }],
  });
  return assignments.map((assignment) => assignment.role.name);
};

// SUPERADMIN LOGIN

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = normalizeEmail(email);

    const user = await User.findOne({ where: { email: normalizedEmail } });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is inactive.' });
    }

    const superadminRole = await Role.findOne({
      where: { name: 'superadmin' },
    });

    if (!superadminRole) {
      return res.status(500).json({ message: 'Superadmin role is not configured.' });
    }

    const assignment = await UserRole.findOne({
      where: {
        userId: user.id,
        roleId: superadminRole.id,
        suspended: false,
      },
    });

    if (!assignment) {
      return res.status(403).json({ message: 'Active superadmin role is required.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const roles = await getActiveRoleNames(user.id);

    const token = jwt.sign({ id: user.id, roles }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    });

    return res.status(200).json({
      message: 'Superadmin login successful.',
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
    console.error('Superadmin login error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// SUPERADMIN ME

exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    return res.status(200).json({
      success: true,
      message: 'Superadmin details fetched successfully.',
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
    console.error('Get superadmin details error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// APPOINT USER AS VENDOR

exports.appointVendor = async (req, res) => {
  try {
    const { userId } = req.params;
    const targetUser = await User.findByPk(userId);

    if (!targetUser) return res.status(404).json({ message: 'User not found.' });

    const vendorRole = await Role.findOne({ where: { name: 'vendor' } });
    if (!vendorRole) return res.status(500).json({ message: 'Vendor role is not configured.' });

    let vendorAssignment = await UserRole.findOne({
      where: { userId: targetUser.id, roleId: vendorRole.id },
    });

    if (vendorAssignment) {
      if (!vendorAssignment.suspended) {
        return res.status(409).json({ message: 'User is already an active vendor.' });
      }

      vendorAssignment.suspended = false;
      vendorAssignment.suspendedAt = null;
      vendorAssignment.assignedBy = req.user.id;
      vendorAssignment.assignedAt = new Date();
      await vendorAssignment.save();

      return res.status(200).json({
        message: 'Vendor role reactivated successfully.',
        user: { id: targetUser.id, email: targetUser.email },
        role: { name: 'vendor', suspended: false },
      });
    }

    vendorAssignment = await UserRole.create({
      userId: targetUser.id,
      roleId: vendorRole.id,
      suspended: false,
      assignedBy: req.user.id,
      assignedAt: new Date(),
    });

    return res.status(201).json({
      message: 'User appointed as vendor successfully.',
      user: { id: targetUser.id, email: targetUser.email },
      role: { name: 'vendor', suspended: vendorAssignment.suspended },
    });
  } catch (error) {
    console.error('Appoint vendor error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// SUSPEND VENDOR

exports.suspendVendor = async (req, res) => {
  try {
    const { userId } = req.params;
    const vendorRole = await Role.findOne({ where: { name: 'vendor' } });

    if (!vendorRole) return res.status(500).json({ message: 'Vendor role is not configured.' });

    const vendorAssignment = await UserRole.findOne({
      where: { userId, roleId: vendorRole.id },
    });

    if (!vendorAssignment) {
      return res.status(404).json({ message: 'Vendor role assignment not found.' });
    }

    if (vendorAssignment.suspended) {
      return res.status(400).json({ message: 'Vendor is already suspended.' });
    }

    vendorAssignment.suspended = true;
    vendorAssignment.suspendedAt = new Date();
    await vendorAssignment.save();

    return res.status(200).json({
      message: 'Vendor suspended successfully.',
      userId: Number(userId),
      role: { name: 'vendor', suspended: true },
    });
  } catch (error) {
    console.error('Suspend vendor error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ACTIVATE VENDOR

exports.activateVendor = async (req, res) => {
  try {
    const { userId } = req.params;
    const vendorRole = await Role.findOne({ where: { name: 'vendor' } });

    if (!vendorRole) return res.status(500).json({ message: 'Vendor role is not configured.' });

    const vendorAssignment = await UserRole.findOne({
      where: { userId, roleId: vendorRole.id },
    });

    if (!vendorAssignment) {
      return res.status(404).json({ message: 'Vendor role assignment not found.' });
    }

    vendorAssignment.suspended = false;
    vendorAssignment.suspendedAt = null;
    await vendorAssignment.save();

    return res.status(200).json({
      message: 'Vendor activated successfully.',
      userId: Number(userId),
      role: { name: 'vendor', suspended: false },
    });
  } catch (error) {
    console.error('Activate vendor error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
