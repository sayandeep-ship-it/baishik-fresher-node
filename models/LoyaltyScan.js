const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LoyaltyScan = sequelize.define(
  'LoyaltyScan',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
    },

    loyaltyProgramId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'loyalty_program_id',
    },

    status: {
      type: DataTypes.ENUM('PENDING_PIN', 'AWARDED', 'EXPIRED'),
      allowNull: false,
      defaultValue: 'AWARDED',
    },

    starsAwarded: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'stars_awarded',
    },

    pinVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'pin_verified',
    },

    scannedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'scanned_at',
    },

    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'verified_at',
    },
  },
  {
    tableName: 'loyalty_scans',
    timestamps: true,
    indexes: [
      {
        fields: ['user_id', 'loyalty_program_id', 'scanned_at'],
        name: 'loyalty_scans_user_program_time_index',
      },
      {
        fields: ['status'],
        name: 'loyalty_scans_status_index',
      },
    ],
  }
);

module.exports = LoyaltyScan;
