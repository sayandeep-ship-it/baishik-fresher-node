"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable(
            "user_vendor_enrollments",
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

                vendor_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,

                    references: {
                        model: "users",
                        key: "id"
                    },

                    onUpdate: "CASCADE",
                    onDelete: "RESTRICT"
                },

                stars_collected: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    defaultValue: 0
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
            "user_vendor_enrollments",
            ["user_id", "vendor_id"],
            {
                unique: true,
                name:
                    "user_vendor_enrollments_user_id_vendor_id_unique"
            }
        );
    },

    async down(queryInterface) {
        await queryInterface.dropTable(
            "user_vendor_enrollments"
        );
    }
};
