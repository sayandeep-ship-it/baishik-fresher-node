const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserVendorEnrollment = sequelize.define(
  'UserVendorEnrollment',
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

    vendorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'vendor_id',
    },

    starsCollected: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'stars_collected',
    },

    pendingStars: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'pending_stars',
    },

    redeemedStars: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'redeemed_stars',
    },
  },
  {
    tableName: 'user_vendor_enrollments',
    timestamps: true,

    indexes: [
      {
        unique: true,
        fields: ['user_id', 'vendor_id'],
        name: 'user_vendor_enrollments_user_id_vendor_id_unique',
      },
    ],
  }
);

module.exports = UserVendorEnrollment;
