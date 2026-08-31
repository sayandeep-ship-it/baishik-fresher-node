'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // =================================================
    // 1. CREATE user_roles TABLE
    // =================================================

    await queryInterface.createTable('user_roles', {
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

      role_id: {
        type: Sequelize.INTEGER,
        allowNull: false,

        references: {
          model: 'roles',
          key: 'id',
        },

        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      suspended: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      assigned_by: {
        type: Sequelize.INTEGER,
        allowNull: true,

        references: {
          model: 'users',
          key: 'id',
        },

        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

      assigned_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      suspended_at: {
        type: Sequelize.DATE,
        allowNull: true,
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

    // =================================================
    // 2. UNIQUE USER + ROLE
    // =================================================

    await queryInterface.addIndex('user_roles', ['user_id', 'role_id'], {
      unique: true,
      name: 'user_roles_user_id_role_id_unique',
    });

    // =================================================
    // 3. INDEX USER ID
    // =================================================

    await queryInterface.addIndex('user_roles', ['user_id'], {
      name: 'user_roles_user_id_index',
    });

    // =================================================
    // 4. INDEX ROLE ID
    // =================================================

    await queryInterface.addIndex('user_roles', ['role_id'], {
      name: 'user_roles_role_id_index',
    });

    // =================================================
    // 5. MIGRATE EXISTING roleId DATA
    // =================================================

    await queryInterface.sequelize.query(`
            INSERT INTO user_roles (
                user_id,
                role_id,
                suspended,
                assigned_by,
                assigned_at,
                createdAt,
                updatedAt
            )
            SELECT
                id,
                roleId,
                false,
                NULL,
                NOW(),
                createdAt,
                updatedAt
            FROM users
            WHERE roleId IS NOT NULL
        `);

    // =================================================
    // 6. REMOVE users.roleId
    // =================================================

    await queryInterface.removeColumn('users', 'roleId');

    // =================================================
    // 7. HANDLE OLD OTP FIELDS
    // =================================================

    await queryInterface.addColumn('users', 'otp', {
      type: Sequelize.STRING(6),
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'otpExpiry', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.removeColumn('users', 'emailVerificationOtpHash');

    await queryInterface.removeColumn('users', 'emailVerificationOtpExpiry');

    await queryInterface.removeColumn('users', 'passwordResetOtpHash');

    await queryInterface.removeColumn('users', 'passwordResetOtpExpiry');
  },

  async down(queryInterface, Sequelize) {
    // =================================================
    // 1. RESTORE roleId
    // =================================================

    await queryInterface.addColumn('users', 'roleId', {
      type: Sequelize.INTEGER,
      allowNull: true,

      references: {
        model: 'roles',
        key: 'id',
      },

      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });

    // Restore one role per user.
    // This is only for rollback because the old schema
    // cannot represent multiple roles.
    await queryInterface.sequelize.query(`
            UPDATE users u
            INNER JOIN user_roles ur
                ON ur.user_id = u.id
            SET u.roleId = ur.role_id
            WHERE u.roleId IS NULL
        `);

    // =================================================
    // 2. REMOVE NEW OTP FIELDS
    // =================================================

    await queryInterface.removeColumn('users', 'otp');

    await queryInterface.removeColumn('users', 'otpExpiry');

    // =================================================
    // 3. RESTORE OLD OTP FIELDS
    // =================================================

    await queryInterface.addColumn('users', 'emailVerificationOtpHash', {
      type: Sequelize.STRING(64),
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'emailVerificationOtpExpiry', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'passwordResetOtpHash', {
      type: Sequelize.STRING(64),
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'passwordResetOtpExpiry', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // =================================================
    // 4. DROP user_roles
    // =================================================

    await queryInterface.dropTable('user_roles');
  },
};
