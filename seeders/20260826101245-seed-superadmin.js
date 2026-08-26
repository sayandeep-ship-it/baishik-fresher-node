"use strict";

const bcrypt = require("bcryptjs");

module.exports = {
    async up(queryInterface) {
        const [roles] = await queryInterface.sequelize.query(
            "SELECT id FROM roles WHERE name = 'superadmin' LIMIT 1"
        );

        if (!roles.length) {
            throw new Error(
                "Superadmin role does not exist. Run the role seeder first."
            );
        }

        const email = process.env.SUPERADMIN_EMAIL;
        const password = process.env.SUPERADMIN_PASSWORD;

        if (!email || !password) {
            throw new Error(
                "SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be set in .env"
            );
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const firstName = process.env.SUPERADMIN_FIRST_NAME;
        const lastName = process.env.SUPERADMIN_LAST_NAME;
        const now = new Date();

        await queryInterface.bulkInsert("users", [
            {
                firstName,
                lastName,

                email: email.toLowerCase().trim(),

                password: hashedPassword,

                roleId: roles[0].id,

                isActive: true,

                emailVerifiedAt: now,

                passwordResetVersion: 0,

                createdAt: now,

                updatedAt: now
            }
        ]);
    },

    async down(queryInterface) {
        await queryInterface.bulkDelete("users", {
            email: process.env.SUPERADMIN_EMAIL
        });
    }
};