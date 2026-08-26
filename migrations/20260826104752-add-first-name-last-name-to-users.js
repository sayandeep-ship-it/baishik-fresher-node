"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            "users",
            "firstName",
            {
                type: Sequelize.STRING(100),
                allowNull: false,
                defaultValue: ""
            }
        );

        await queryInterface.addColumn(
            "users",
            "lastName",
            {
                type: Sequelize.STRING(100),
                allowNull: false,
                defaultValue: ""
            }
        );
    },

    async down(queryInterface) {
        await queryInterface.removeColumn(
            "users",
            "firstName"
        );

        await queryInterface.removeColumn(
            "users",
            "lastName"
        );
    }
};