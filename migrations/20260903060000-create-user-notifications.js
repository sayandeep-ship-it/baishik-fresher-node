'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const tableNames = tables.map((table) =>
      typeof table === 'string' ? table : table.tableName || table.name
    );

    if (!tableNames.includes('user_notifications')) {
      await queryInterface.createTable('user_notifications', {
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

        vendor_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },

        stars_at_notification: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },

        message: {
          type: Sequelize.TEXT,
          allowNull: false,
        },

        is_read: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },

        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },

        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
      });

      // Prevent duplicate notifications for the same user + program
      await queryInterface.addIndex(
        'user_notifications',
        ['user_id', 'loyalty_program_id'],
        {
          unique: true,
          name: 'user_notifications_user_program_unique',
        }
      );

      await queryInterface.addIndex(
        'user_notifications',
        ['user_id', 'is_read'],
        {
          name: 'user_notifications_user_read_index',
        }
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_notifications');
  },
};
