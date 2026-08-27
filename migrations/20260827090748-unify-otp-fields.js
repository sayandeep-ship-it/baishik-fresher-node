"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        // =================================================
        // ADD NEW SHARED OTP FIELDS
        // =================================================

        await queryInterface.addColumn(
            "users",
            "otp",
            {
                type: Sequelize.STRING(6),
                allowNull: true
            }
        );

        await queryInterface.addColumn(
            "users",
            "otpExpiry",
            {
                type: Sequelize.DATE,
                allowNull: true
            }
        );

        // =================================================
        // REMOVE OLD OTP FIELDS
        // =================================================

        await queryInterface.removeColumn(
            "users",
            "emailVerificationOtpHash"
        );

        await queryInterface.removeColumn(
            "users",
            "emailVerificationOtpExpiry"
        );

        await queryInterface.removeColumn(
            "users",
            "passwordResetOtpHash"
        );

        await queryInterface.removeColumn(
            "users",
            "passwordResetOtpExpiry"
        );
    },

    async down(queryInterface, Sequelize) {
        // =================================================
        // RESTORE OLD OTP FIELDS
        // =================================================

        await queryInterface.addColumn(
            "users",
            "emailVerificationOtpHash",
            {
                type: Sequelize.STRING(64),
                allowNull: true
            }
        );

        await queryInterface.addColumn(
            "users",
            "emailVerificationOtpExpiry",
            {
                type: Sequelize.DATE,
                allowNull: true
            }
        );

        await queryInterface.addColumn(
            "users",
            "passwordResetOtpHash",
            {
                type: Sequelize.STRING(64),
                allowNull: true
            }
        );

        await queryInterface.addColumn(
            "users",
            "passwordResetOtpExpiry",
            {
                type: Sequelize.DATE,
                allowNull: true
            }
        );

        // =================================================
        // REMOVE NEW SHARED OTP FIELDS
        // =================================================

        await queryInterface.removeColumn(
            "users",
            "otp"
        );

        await queryInterface.removeColumn(
            "users",
            "otpExpiry"
        );
    }
};