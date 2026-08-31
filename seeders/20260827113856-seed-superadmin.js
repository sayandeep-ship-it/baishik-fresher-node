'use strict';

const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface) {
    // =================================================
    // ENVIRONMENT VALUES
    // =================================================

    const email = process.env.SUPERADMIN_EMAIL;

    const password = process.env.SUPERADMIN_PASSWORD;

    const firstName = process.env.SUPERADMIN_FIRST_NAME;

    const lastName = process.env.SUPERADMIN_LAST_NAME;

    if (!email || !password) {
      throw new Error('SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be set in .env');
    }

    const normalizedEmail = email.toLowerCase().trim();

    // =================================================
    // FIND SUPERADMIN ROLE
    // =================================================

    const [roles] = await queryInterface.sequelize.query(
      `
                SELECT id
                FROM roles
                WHERE name = 'superadmin'
                LIMIT 1
                `
    );

    if (!roles.length) {
      throw new Error('Superadmin role does not exist. Run the role seeder first.');
    }

    const superadminRoleId = roles[0].id;

    // =================================================
    // CHECK WHETHER USER ALREADY EXISTS
    // =================================================

    const [existingUsers] = await queryInterface.sequelize.query(
      `
                SELECT id
                FROM users
                WHERE email = :email
                LIMIT 1
                `,
      {
        replacements: {
          email: normalizedEmail,
        },
      }
    );

    let userId;

    // =================================================
    // CREATE SUPERADMIN USER IF IT DOES NOT EXIST
    // =================================================

    if (!existingUsers.length) {
      const hashedPassword = await bcrypt.hash(password, 12);

      const now = new Date();

      await queryInterface.bulkInsert('users', [
        {
          firstName: firstName,

          lastName: lastName,

          email: normalizedEmail,

          password: hashedPassword,

          isActive: true,

          emailVerifiedAt: now,

          passwordResetVersion: 0,

          createdAt: now,

          updatedAt: now,
        },
      ]);

      // =================================================
      // GET CREATED USER ID
      // =================================================

      const [createdUsers] = await queryInterface.sequelize.query(
        `
                    SELECT id
                    FROM users
                    WHERE email = :email
                    LIMIT 1
                    `,
        {
          replacements: {
            email: normalizedEmail,
          },
        }
      );

      if (!createdUsers.length) {
        throw new Error('Unable to find newly created superadmin user.');
      }

      userId = createdUsers[0].id;
    } else {
      userId = existingUsers[0].id;
    }

    // =================================================
    // CHECK SUPERADMIN ROLE ASSIGNMENT
    // =================================================

    const [existingAssignments] = await queryInterface.sequelize.query(
      `
                SELECT id
                FROM user_roles
                WHERE user_id = :userId
                  AND role_id = :roleId
                LIMIT 1
                `,
      {
        replacements: {
          userId: userId,

          roleId: superadminRoleId,
        },
      }
    );

    // =================================================
    // ASSIGN SUPERADMIN ROLE
    // =================================================

    if (!existingAssignments.length) {
      const now = new Date();

      await queryInterface.bulkInsert('user_roles', [
        {
          user_id: userId,

          role_id: superadminRoleId,

          suspended: false,

          assigned_by: null,

          assigned_at: now,

          createdAt: now,

          updatedAt: now,
        },
      ]);
    }
  },

  // =====================================================
  // DOWN
  // =====================================================

  async down(queryInterface) {
    const email = process.env.SUPERADMIN_EMAIL;

    if (!email) {
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    const [users] = await queryInterface.sequelize.query(
      `
                SELECT id
                FROM users
                WHERE email = :email
                LIMIT 1
                `,
      {
        replacements: {
          email: normalizedEmail,
        },
      }
    );

    if (users.length) {
      await queryInterface.bulkDelete('user_roles', {
        user_id: users[0].id,
      });
    }

    await queryInterface.bulkDelete('users', {
      email: normalizedEmail,
    });
  },
};
