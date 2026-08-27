const sequelize = require("../config/database");

const User = require("./User");
const Role = require("./Role");
const UserRole = require("./UserRole");


// =====================================================
// USER <-> ROLE
// MANY-TO-MANY THROUGH user_roles
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
// USER ROLE DIRECT ASSOCIATIONS
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
// ROLE DIRECT ASSOCIATIONS
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
// USER ROLE ASSIGNED-BY ASSOCIATION
// =====================================================

UserRole.belongsTo(User, {
    foreignKey: "assignedBy",
    as: "assignedByUser"
});


module.exports = {
    sequelize,
    User,
    Role,
    UserRole
};