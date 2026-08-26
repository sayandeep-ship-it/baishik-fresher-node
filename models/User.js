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

        // Registration OTP
        emailVerificationOtpHash: {
            type: DataTypes.STRING(64),
            allowNull: true
        },

        emailVerificationOtpExpiry: {
            type: DataTypes.DATE,
            allowNull: true
        },

        // Password reset OTP
        passwordResetOtpHash: {
            type: DataTypes.STRING(64),
            allowNull: true
        },

        passwordResetOtpExpiry: {
            type: DataTypes.DATE,
            allowNull: true
        },

        // Used to invalidate previously issued reset tokens
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