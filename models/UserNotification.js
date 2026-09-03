const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserNotification = sequelize.define(
  'UserNotification',
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

    vendorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'vendor_id',
    },

    starsAtNotification: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'stars_at_notification',
    },

    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_read',
    },
  },
  {
    tableName: 'user_notifications',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'loyalty_program_id'],
        name: 'user_notifications_user_program_unique',
      },
      {
        fields: ['user_id', 'is_read'],
        name: 'user_notifications_user_read_index',
      },
    ],
  }
);

module.exports = UserNotification;
