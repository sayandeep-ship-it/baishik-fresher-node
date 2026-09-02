'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add columns to loyalty_programs
    await queryInterface.addColumn('loyalty_programs', 'qr_code_path', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('loyalty_programs', 'qr_code_url', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('loyalty_programs', 'awarded_stars_per_scan', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    });

    // Add columns to user_vendor_enrollments
    await queryInterface.addColumn('user_vendor_enrollments', 'pending_stars', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('user_vendor_enrollments', 'redeemed_stars', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('loyalty_programs', 'qr_code_path');
    await queryInterface.removeColumn('loyalty_programs', 'qr_code_url');
    await queryInterface.removeColumn('loyalty_programs', 'awarded_stars_per_scan');

    await queryInterface.removeColumn('user_vendor_enrollments', 'pending_stars');
    await queryInterface.removeColumn('user_vendor_enrollments', 'redeemed_stars');
  }
};
