const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LoyaltyProgramPin = sequelize.define(
  'LoyaltyProgramPin',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    loyaltyProgramId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'loyalty_program_id',
    },

    vendorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'vendor_id',
    },

    pinHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'pin_hash',
    },

    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at',
    },

    usedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'used_at',
    },

    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'revoked_at',
    },
  },
  {
    tableName: 'loyalty_program_pins',
    timestamps: true,
    indexes: [
      {
        fields: ['loyalty_program_id'],
        name: 'loyalty_program_pins_program_index',
      },
      {
        fields: ['vendor_id'],
        name: 'loyalty_program_pins_vendor_index',
      },
      {
        fields: ['expires_at'],
        name: 'loyalty_program_pins_expiry_index',
      },
    ],
  }
);

module.exports = LoyaltyProgramPin;
