"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable(
            "vendor_details",
            {
                id: {
                    type: Sequelize.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false
                },

                user_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,

                    references: {
                        model: "users",
                        key: "id"
                    },

                    onUpdate: "CASCADE",
                    onDelete: "CASCADE"
                },

                has_address: {
                    type: Sequelize.BOOLEAN,
                    allowNull: false,
                    defaultValue: false
                },

                street_address: {
                    type: Sequelize.STRING(255),
                    allowNull: true
                },

                city: {
                    type: Sequelize.STRING(100),
                    allowNull: true
                },

                country: {
                    type: Sequelize.STRING(100),
                    allowNull: true
                },

                state: {
                    type: Sequelize.STRING(100),
                    allowNull: true
                },

                pin_code: {
                    type: Sequelize.STRING(20),
                    allowNull: true
                },

                createdAt: {
                    type: Sequelize.DATE,
                    allowNull: false
                },

                updatedAt: {
                    type: Sequelize.DATE,
                    allowNull: false
                }
            }
        );

        await queryInterface.addIndex(
            "vendor_details",
            ["user_id"],
            {
                unique: true,
                name: "vendor_details_user_id_unique"
            }
        );
    },

    async down(queryInterface) {
        await queryInterface.dropTable(
            "vendor_details"
        );
    }
};