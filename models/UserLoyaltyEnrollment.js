const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserLoyaltyEnrollment = sequelize.define(
  'UserLoyaltyEnrollment',
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
    tableName: 'user_loyalty_enrollments',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'loyalty_program_id'],
        name: 'user_loyalty_enrollments_user_program_unique',
      },
    ],
  }
);

module.exports = UserLoyaltyEnrollment;
