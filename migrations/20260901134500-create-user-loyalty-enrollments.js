'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const tableNames = tables.map((table) => (typeof table === 'string' ? table : table.tableName || table.name));

    if (!tableNames.includes('user_loyalty_enrollments')) {
      await queryInterface.createTable('user_loyalty_enrollments', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },

        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },

        loyalty_program_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'loyalty_programs',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },

        stars_collected: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        pending_stars: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        redeemed_stars: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },

        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
        },

        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
        },
      });

      await queryInterface.addIndex('user_loyalty_enrollments', ['user_id', 'loyalty_program_id'], {
        unique: true,
        name: 'user_loyalty_enrollments_user_program_unique',
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_loyalty_enrollments');
  },
};
