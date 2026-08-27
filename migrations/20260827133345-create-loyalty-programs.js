"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable(
            "loyalty_programs",
            {
                id: {
                    type: Sequelize.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false
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

                image: {
                    type: Sequelize.STRING(500),
                    allowNull: true
                },

                program_name: {
                    type: Sequelize.STRING(255),
                    allowNull: false
                },

                required_star_collection: {
                    type: Sequelize.INTEGER,
                    allowNull: false
                },

                qr_code_scan_interval_value: {
                    type: Sequelize.INTEGER,
                    allowNull: false
                },

                qr_code_scan_interval_unit: {
                    type: Sequelize.ENUM(
                        "MINUTES",
                        "HOURS",
                        "DAYS"
                    ),
                    allowNull: false
                },

                program_rules: {
                    type: Sequelize.TEXT,
                    allowNull: true
                },

                notification_enabled: {
                    type: Sequelize.BOOLEAN,
                    allowNull: false,
                    defaultValue: false
                },

                notification_star_field: {
                    type: Sequelize.STRING(50),
                    allowNull: true,
                    defaultValue: "STAR_COUNT"
                },

                notification_condition_operator: {
                    type: Sequelize.ENUM(
                        "LESS_THAN",
                        "GREATER_THAN",
                        "EQUAL_TO",
                        "LESS_THAN_OR_EQUAL",
                        "GREATER_THAN_OR_EQUAL"
                    ),
                    allowNull: true
                },

                notification_comparison_operator: {
                    type: Sequelize.ENUM(
                        "EQUAL_TO",
                        "NOT_EQUAL_TO",
                        "LESS_THAN",
                        "GREATER_THAN",
                        "LESS_THAN_OR_EQUAL",
                        "GREATER_THAN_OR_EQUAL"
                    ),
                    allowNull: true
                },

                notification_comparison_value: {
                    type: Sequelize.INTEGER,
                    allowNull: true
                },

                notification_action: {
                    type: Sequelize.STRING(100),
                    allowNull: true,
                    defaultValue: "SEND_NOTIFICATION"
                },

                notification_template: {
                    type: Sequelize.STRING(255),
                    allowNull: true
                },

                enable_pin_verification: {
                    type: Sequelize.BOOLEAN,
                    allowNull: false,
                    defaultValue: false
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
            "loyalty_programs",
            ["vendor_id"],
            {
                name:
                    "loyalty_programs_vendor_id_index"
            }
        );
    },

    async down(queryInterface) {
        await queryInterface.dropTable(
            "loyalty_programs"
        );
    }
};