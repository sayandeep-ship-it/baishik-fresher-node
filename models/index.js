const sequelize = require('../config/database');

const User = require('./User');
const Role = require('./Role');
const UserRole = require('./UserRole');
const VendorDetails = require('./VendorDetails');
const LoyaltyProgram = require('./LoyaltyProgram');
const UserVendorEnrollment = require('./UserVendorEnrollment');
const UserLoyaltyEnrollment = require('./UserLoyaltyEnrollment');
const LoyaltyProgramPin = require('./LoyaltyProgramPin');
const LoyaltyScan = require('./LoyaltyScan');

// USER <-> ROLE

User.belongsToMany(Role, {
  through: UserRole,
  foreignKey: 'userId',
  otherKey: 'roleId',
  as: 'roles',
});

Role.belongsToMany(User, {
  through: UserRole,
  foreignKey: 'roleId',
  otherKey: 'userId',
  as: 'users',
});

// USER <-> USER ROLE

User.hasMany(UserRole, {
  foreignKey: 'userId',
  as: 'userRoles',
});

UserRole.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// ROLE <-> USER ROLE

Role.hasMany(UserRole, {
  foreignKey: 'roleId',
  as: 'userRoles',
});

UserRole.belongsTo(Role, {
  foreignKey: 'roleId',
  as: 'role',
});

// USER ROLE ASSIGNED BY

UserRole.belongsTo(User, {
  foreignKey: 'assignedBy',
  as: 'assignedByUser',
});

// USER <-> VENDOR DETAILS

User.hasOne(VendorDetails, {
  foreignKey: 'userId',
  as: 'vendorDetails',
  onDelete: 'CASCADE',
});

VendorDetails.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// USER <-> LOYALTY PROGRAM

User.hasMany(LoyaltyProgram, {
  foreignKey: 'vendorId',
  as: 'loyaltyPrograms',
  onDelete: 'RESTRICT',
});

LoyaltyProgram.belongsTo(User, {
  foreignKey: 'vendorId',
  as: 'vendor',
});

// USER <-> VENDOR ENROLLMENT

User.hasMany(UserVendorEnrollment, {
  foreignKey: 'userId',
  as: 'vendorEnrollments',
  onDelete: 'CASCADE',
});

UserVendorEnrollment.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

User.hasMany(UserVendorEnrollment, {
  foreignKey: 'vendorId',
  as: 'storeEnrollments',
  onDelete: 'RESTRICT',
});

UserVendorEnrollment.belongsTo(User, {
  foreignKey: 'vendorId',
  as: 'vendor',
});

// USER <-> LOYALTY ENROLLMENT

User.hasMany(UserLoyaltyEnrollment, {
  foreignKey: 'userId',
  as: 'loyaltyEnrollments',
  onDelete: 'CASCADE',
});

UserLoyaltyEnrollment.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

LoyaltyProgram.hasMany(UserLoyaltyEnrollment, {
  foreignKey: 'loyaltyProgramId',
  as: 'enrollments',
  onDelete: 'CASCADE',
});

UserLoyaltyEnrollment.belongsTo(LoyaltyProgram, {
  foreignKey: 'loyaltyProgramId',
  as: 'loyaltyProgram',
});

// LOYALTY PROGRAM <-> PIN

LoyaltyProgram.hasMany(LoyaltyProgramPin, {
  foreignKey: 'loyaltyProgramId',
  as: 'pins',
  onDelete: 'CASCADE',
});

LoyaltyProgramPin.belongsTo(LoyaltyProgram, {
  foreignKey: 'loyaltyProgramId',
  as: 'loyaltyProgram',
});

User.hasMany(LoyaltyProgramPin, {
  foreignKey: 'vendorId',
  as: 'generatedLoyaltyPins',
  onDelete: 'RESTRICT',
});

LoyaltyProgramPin.belongsTo(User, {
  foreignKey: 'vendorId',
  as: 'vendor',
});

// USER <-> LOYALTY SCANS

User.hasMany(LoyaltyScan, {
  foreignKey: 'userId',
  as: 'loyaltyScans',
  onDelete: 'CASCADE',
});

LoyaltyScan.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

LoyaltyProgram.hasMany(LoyaltyScan, {
  foreignKey: 'loyaltyProgramId',
  as: 'scans',
  onDelete: 'CASCADE',
});

LoyaltyScan.belongsTo(LoyaltyProgram, {
  foreignKey: 'loyaltyProgramId',
  as: 'loyaltyProgram',
});

module.exports = {
  sequelize,
  User,
  Role,
  UserRole,
  VendorDetails,
  LoyaltyProgram,
  UserVendorEnrollment,
  UserLoyaltyEnrollment,
  LoyaltyProgramPin,
  LoyaltyScan,
};
