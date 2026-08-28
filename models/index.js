const sequelize = require("../config/database");

const User = require("./User");
const Role = require("./Role");
const UserRole = require("./UserRole");
const VendorDetails = require("./VendorDetails");
const LoyaltyProgram = require("./LoyaltyProgram");
const UserVendorEnrollment = require("./UserVendorEnrollment");


// =====================================================
// USER <-> ROLE
// =====================================================

User.belongsToMany(Role, {
    through: UserRole,
    foreignKey: "userId",
    otherKey: "roleId",
    as: "roles"
});

Role.belongsToMany(User, {
    through: UserRole,
    foreignKey: "roleId",
    otherKey: "userId",
    as: "users"
});


// =====================================================
// USER <-> USER ROLE
// =====================================================

User.hasMany(UserRole, {
    foreignKey: "userId",
    as: "userRoles"
});

UserRole.belongsTo(User, {
    foreignKey: "userId",
    as: "user"
});


// =====================================================
// ROLE <-> USER ROLE
// =====================================================

Role.hasMany(UserRole, {
    foreignKey: "roleId",
    as: "userRoles"
});

UserRole.belongsTo(Role, {
    foreignKey: "roleId",
    as: "role"
});


// =====================================================
// USER ROLE ASSIGNED BY
// =====================================================

UserRole.belongsTo(User, {
    foreignKey: "assignedBy",
    as: "assignedByUser"
});


// =====================================================
// USER <-> VENDOR DETAILS
// =====================================================

User.hasOne(VendorDetails, {
    foreignKey: "userId",
    as: "vendorDetails",
    onDelete: "CASCADE"
});

VendorDetails.belongsTo(User, {
    foreignKey: "userId",
    as: "user"
});


// =====================================================
// USER <-> LOYALTY PROGRAM
// =====================================================
//
// One vendor/user can own many loyalty programs.
//
// vendorId points to users.id.
//
// =====================================================

User.hasMany(LoyaltyProgram, {
    foreignKey: "vendorId",
    as: "loyaltyPrograms",
    onDelete: "RESTRICT"
});

LoyaltyProgram.belongsTo(User, {
    foreignKey: "vendorId",
    as: "vendor"
});


// =====================================================
// USER <-> VENDOR ENROLLMENT
// =====================================================
//
// Tracks stars collected by a user under a vendor.
//
// =====================================================

User.hasMany(UserVendorEnrollment, {
    foreignKey: "userId",
    as: "vendorEnrollments",
    onDelete: "CASCADE"
});

UserVendorEnrollment.belongsTo(User, {
    foreignKey: "userId",
    as: "user"
});

User.hasMany(UserVendorEnrollment, {
    foreignKey: "vendorId",
    as: "storeEnrollments",
    onDelete: "RESTRICT"
});

UserVendorEnrollment.belongsTo(User, {
    foreignKey: "vendorId",
    as: "vendor"
});


module.exports = {
    sequelize,
    User,
    Role,
    UserRole,
    VendorDetails,
    LoyaltyProgram,
    UserVendorEnrollment
};