'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add details column
    await queryInterface.addColumn('loyalty_programs', 'details', {
      type: Sequelize.JSON,
      allowNull: true,
    });
    // Add is_active column
    await queryInterface.addColumn('loyalty_programs', 'is_active', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true, // Sets existing rows to true by default
    });
  },
  async down(queryInterface) {
    // Remove columns in reverse order
    await queryInterface.removeColumn('loyalty_programs', 'is_active');
    await queryInterface.removeColumn('loyalty_programs', 'details');
  },
};
