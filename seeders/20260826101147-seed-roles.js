"use strict";

module.exports = {
    async up(queryInterface) {
        const now = new Date();

        await queryInterface.bulkInsert("roles", [
            {
                name: "user",
                createdAt: now,
                updatedAt: now
            },
            {
                name: "vendor",
                createdAt: now,
                updatedAt: now
            },
            {
                name: "superadmin",
                createdAt: now,
                updatedAt: now
            }
        ]);
    },

    async down(queryInterface) {
        await queryInterface.bulkDelete("roles", {
            name: [
                "user",
                "vendor",
                "superadmin"
            ]
        });
    }
};