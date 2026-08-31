const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LoyaltyProgram = sequelize.define(
  'LoyaltyProgram',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // =================================================
    // VENDOR
    // =================================================

    vendorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'vendor_id',
    },

    // =================================================
    // IMAGE
    // =================================================

    image: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },

    // =================================================
    // BASIC PROGRAM INFORMATION
    // =================================================

    programName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'program_name',
    },

    requiredStarCollection: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'required_star_collection',
    },

    // =================================================
    // QR CODE SCAN INTERVAL
    // =================================================

    qrCodeScanIntervalValue: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'qr_code_scan_interval_value',
    },

    qrCodeScanIntervalUnit: {
      type: DataTypes.ENUM('MINUTES', 'HOURS', 'DAYS'),
      allowNull: false,
      field: 'qr_code_scan_interval_unit',
    },

    // =================================================
    // PROGRAM RULES
    // =================================================

    programRules: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'program_rules',
    },

    // =================================================
    // NOTIFICATION
    // =================================================

    notificationEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'notification_enabled',
    },

    // "If No. of Star"
    notificationStarField: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'STAR_COUNT',
      field: 'notification_star_field',
    },

    // Example:
    // LESS_THAN
    // GREATER_THAN
    // EQUAL_TO
    notificationConditionOperator: {
      type: DataTypes.ENUM('LESS_THAN', 'GREATER_THAN', 'EQUAL_TO', 'LESS_THAN_OR_EQUAL', 'GREATER_THAN_OR_EQUAL'),
      allowNull: true,
      field: 'notification_condition_operator',
    },

    // Example:
    // EQUAL_TO
    // NOT_EQUAL_TO
    // LESS_THAN
    // GREATER_THAN
    notificationComparisonOperator: {
      type: DataTypes.ENUM(
        'EQUAL_TO',
        'NOT_EQUAL_TO',
        'LESS_THAN',
        'GREATER_THAN',
        'LESS_THAN_OR_EQUAL',
        'GREATER_THAN_OR_EQUAL'
      ),
      allowNull: true,
      field: 'notification_comparison_operator',
    },

    // "Required Star"
    notificationComparisonValue: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'notification_comparison_value',
    },

    // "Send Notification"
    notificationAction: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: 'SEND_NOTIFICATION',
      field: 'notification_action',
    },

    // "Select Template"
    notificationTemplate: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'notification_template',
    },

    // =================================================
    // PROGRAM STATUS
    // =================================================

    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    // =================================================
    // QR CODE + PIN VERIFICATION
    // =================================================

    // New canonical flag.
    hasPin: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'has_pin',
    },

    // Unique server-side value embedded in the QR payload.
    qrCodeToken: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: true,
      field: 'qr_code_token',
    },

    // Generated QR image as a data URL.
    qrCodeImage: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
      field: 'qr_code_image',
    },

    // =================================================
    // PIN VERIFICATION (backward-compatible alias)
    // =================================================

    enablePinVerification: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'enable_pin_verification',
    },
  },
  {
    tableName: 'loyalty_programs',
    timestamps: true,

    indexes: [
      {
        fields: ['vendor_id'],
        name: 'loyalty_programs_vendor_id_index',
      },
    ],
  }
);

module.exports = LoyaltyProgram;
