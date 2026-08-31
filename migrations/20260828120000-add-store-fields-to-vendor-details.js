'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('vendor_details', 'store_name', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    await queryInterface.addColumn('vendor_details', 'store_type', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    await queryInterface.addColumn('vendor_details', 'image', {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('vendor_details', 'image');

    await queryInterface.removeColumn('vendor_details', 'store_type');

    await queryInterface.removeColumn('vendor_details', 'store_name');
  },
};
