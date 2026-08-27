const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const User = sequelize.define(
    "User",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        firstName: {
            type: DataTypes.STRING(100),
            allowNull: false
        },

        lastName: {
            type: DataTypes.STRING(100),
            allowNull: false
        },

        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },

        password: {
            type: DataTypes.STRING(255),
            allowNull: false
        },

        roleId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },

        emailVerifiedAt: {
            type: DataTypes.DATE,
            allowNull: true
        },

        // Shared OTP
        // Used for:
        // - Email verification
        // - Forgot password
        //
        // OTP is stored directly in the database.
        otp: {
            type: DataTypes.STRING(6),
            allowNull: true
        },

        // Expiry time for the current OTP
        otpExpiry: {
            type: DataTypes.DATE,
            allowNull: true
        },

        // Used to invalidate previously issued password reset tokens
        passwordResetVersion: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        }
    },
    {
        tableName: "users",
        timestamps: true
    }
);

module.exports = User;