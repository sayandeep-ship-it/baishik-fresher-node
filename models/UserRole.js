const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const UserRole = sequelize.define(
    "UserRole",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "user_id"
        },

        roleId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "role_id"
        },

        // false = role is active
        // true  = role is suspended
        suspended: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },

        // Superadmin who assigned the role
        assignedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: "assigned_by"
        },

        assignedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: "assigned_at"
        },

        suspendedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: "suspended_at"
        }
    },
    {
        tableName: "user_roles",
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ["user_id", "role_id"],
                name: "user_roles_user_id_role_id_unique"
            }
        ]
    }
);

module.exports = UserRole;