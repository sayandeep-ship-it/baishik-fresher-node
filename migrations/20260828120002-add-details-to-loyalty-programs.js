"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            "loyalty_programs",
            "details",
            {
                type: Sequelize.JSON,
                allowNull: true
            }
        );
    },

    async down(queryInterface) {
        await queryInterface.removeColumn(
            "loyalty_programs",
            "details"
        );
    }
};
