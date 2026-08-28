const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const LoyaltyProgram = sequelize.define(
    "LoyaltyProgram",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        // =================================================
        // VENDOR
        // =================================================

        vendorId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "vendor_id"
        },

        // =================================================
        // IMAGE
        // =================================================

        image: {
            type: DataTypes.STRING(500),
            allowNull: true
        },

        // =================================================
        // PROGRAM
        // =================================================

        programName: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: "program_name"
        },

        requiredStarCollection: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "required_star_collection"
        },

        qrCodeScanIntervalValue: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "qr_code_scan_interval_value"
        },

        qrCodeScanIntervalUnit: {
            type: DataTypes.ENUM(
                "MINUTES",
                "HOURS",
                "DAYS"
            ),
            allowNull: false,
            field: "qr_code_scan_interval_unit"
        },

        programRules: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: "program_rules"
        },

        // =================================================
        // NOTIFICATION SETTINGS
        // =================================================

        notificationEnabled: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: "notification_enabled"
        },

        // Example: STAR_COUNT
        notificationStarField: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: "notification_star_field"
        },

        notificationConditionOperator: {
            type: DataTypes.ENUM(
                "LESS_THAN",
                "GREATER_THAN",
                "EQUAL_TO",
                "LESS_THAN_OR_EQUAL",
                "GREATER_THAN_OR_EQUAL"
            ),
            allowNull: true,
            field: "notification_condition_operator"
        },

        notificationComparisonOperator: {
            type: DataTypes.ENUM(
                "EQUAL_TO",
                "NOT_EQUAL_TO",
                "LESS_THAN",
                "GREATER_THAN",
                "LESS_THAN_OR_EQUAL",
                "GREATER_THAN_OR_EQUAL"
            ),
            allowNull: true,
            field: "notification_comparison_operator"
        },

        notificationComparisonValue: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: "notification_comparison_value"
        },

        notificationAction: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: "notification_action"
        },

        notificationTemplate: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: "notification_template"
        },

        // =================================================
        // PIN VERIFICATION
        // =================================================

        enablePinVerification: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: "enable_pin_verification"
        },

        details: {
            type: DataTypes.JSON,
            allowNull: true
        }
    },

    {
        tableName: "loyalty_programs",
        timestamps: true,

        indexes: [
            {
                fields: ["vendor_id"],
                name:
                    "loyalty_programs_vendor_id_index"
            }
        ]
    }
);

module.exports = LoyaltyProgram;