'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },

      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },

      password: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },

      roleId: {
        type: Sequelize.INTEGER,
        allowNull: false,

        references: {
          model: 'roles',
          key: 'id',
        },

        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      emailVerifiedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      emailVerificationOtpHash: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },

      emailVerificationOtpExpiry: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      passwordResetOtpHash: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },

      passwordResetOtpExpiry: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      passwordResetVersion: {
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

    await queryInterface.addIndex('users', ['email'], {
      unique: true,
      name: 'users_email_unique',
    });

    await queryInterface.addIndex('users', ['roleId'], {
      name: 'users_role_id_index',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
  },
};
