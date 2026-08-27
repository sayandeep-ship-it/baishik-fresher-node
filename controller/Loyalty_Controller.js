const {
    LoyaltyProgram
} = require("../models");


// =====================================================
// CREATE LOYALTY PROGRAM
// =====================================================

async function createLoyaltyProgram(
    req,
    res
) {
    try {

        const {
            programName,
            requiredStarCollection,
            qrCodeScanIntervalValue,
            qrCodeScanIntervalUnit,
            programRules,

            // Notification
            notificationEnabled,
            notificationStarField,
            notificationConditionOperator,
            notificationComparisonOperator,
            notificationComparisonValue,
            notificationAction,
            notificationTemplate,

            // Pin verification
            enablePinVerification
        } = req.body || {};


        // =================================================
        // VENDOR ID FROM JWT
        // =================================================

        const vendorId =
            req.user.id;


        // =================================================
        // BASIC VALIDATION
        // =================================================

        if (!programName) {
            return res.status(400).json({
                message:
                    "Program name is required"
            });
        }


        if (
            requiredStarCollection ===
                undefined ||
            requiredStarCollection ===
                null ||
            requiredStarCollection === ""
        ) {
            return res.status(400).json({
                message:
                    "Required star collection is required"
            });
        }


        if (
            qrCodeScanIntervalValue ===
                undefined ||
            qrCodeScanIntervalValue ===
                null ||
            qrCodeScanIntervalValue === ""
        ) {
            return res.status(400).json({
                message:
                    "QR code scan interval value is required"
            });
        }


        if (!qrCodeScanIntervalUnit) {
            return res.status(400).json({
                message:
                    "QR code scan interval unit is required"
            });
        }


        // =================================================
        // NUMBER VALIDATION
        // =================================================

        const starCollection =
            Number(
                requiredStarCollection
            );

        const intervalValue =
            Number(
                qrCodeScanIntervalValue
            );


        if (
            !Number.isInteger(
                starCollection
            ) ||
            starCollection <= 0
        ) {
            return res.status(400).json({
                message:
                    "Required star collection must be a positive integer"
            });
        }


        if (
            !Number.isInteger(
                intervalValue
            ) ||
            intervalValue <= 0
        ) {
            return res.status(400).json({
                message:
                    "QR code scan interval value must be a positive integer"
            });
        }


        // =================================================
        // INTERVAL UNIT VALIDATION
        // =================================================

        const allowedUnits = [
            "MINUTES",
            "HOURS",
            "DAYS"
        ];


        const intervalUnit =
            String(
                qrCodeScanIntervalUnit
            ).toUpperCase();


        if (
            !allowedUnits.includes(
                intervalUnit
            )
        ) {
            return res.status(400).json({
                message:
                    "QR code scan interval unit must be MINUTES, HOURS or DAYS"
            });
        }


        // =================================================
        // IMAGE
        // =================================================

        let imagePath = null;

        if (req.file) {
            imagePath =
                `/uploads/loyalty/${req.file.filename}`;
        }


        // =================================================
        // NOTIFICATION
        // =================================================

        const isNotificationEnabled =
            notificationEnabled === true ||
            notificationEnabled === "true";


        let notificationStarFieldValue =
            notificationStarField ||
            "STAR_COUNT";

        let notificationConditionOperatorValue =
            notificationConditionOperator
                ? String(
                    notificationConditionOperator
                ).toUpperCase()
                : null;

        let notificationComparisonOperatorValue =
            notificationComparisonOperator
                ? String(
                    notificationComparisonOperator
                ).toUpperCase()
                : null;

        let notificationComparisonValueNumber =
            null;


        if (
            notificationComparisonValue !==
                undefined &&
            notificationComparisonValue !==
                null &&
            notificationComparisonValue !== ""
        ) {
            notificationComparisonValueNumber =
                Number(
                    notificationComparisonValue
                );

            if (
                !Number.isInteger(
                    notificationComparisonValueNumber
                ) ||
                notificationComparisonValueNumber < 0
            ) {
                return res.status(400).json({
                    message:
                        "Notification comparison value must be a non-negative integer"
                });
            }
        }


        if (
            isNotificationEnabled
        ) {

            if (
                !notificationConditionOperatorValue
            ) {
                return res.status(400).json({
                    message:
                        "Notification condition operator is required when notifications are enabled"
                });
            }


            if (
                !notificationComparisonOperatorValue
            ) {
                return res.status(400).json({
                    message:
                        "Notification comparison operator is required when notifications are enabled"
                });
            }


            if (
                notificationComparisonValueNumber ===
                null
            ) {
                return res.status(400).json({
                    message:
                        "Notification comparison value is required when notifications are enabled"
                });
            }


            if (
                !notificationAction
            ) {
                return res.status(400).json({
                    message:
                        "Notification action is required when notifications are enabled"
                });
            }
        }


        // =================================================
        // CREATE LOYALTY
        // =================================================

        const loyaltyProgram =
            await LoyaltyProgram.create({

                vendorId,

                image:
                    imagePath,

                programName:
                    programName.trim(),

                requiredStarCollection:
                    starCollection,

                qrCodeScanIntervalValue:
                    intervalValue,

                qrCodeScanIntervalUnit:
                    intervalUnit,

                programRules:
                    programRules
                        ? programRules.trim()
                        : null,


                // Notification
                notificationEnabled:
                    isNotificationEnabled,

                notificationStarField:
                    notificationStarFieldValue,

                notificationConditionOperator:
                    isNotificationEnabled
                        ? notificationConditionOperatorValue
                        : null,

                notificationComparisonOperator:
                    isNotificationEnabled
                        ? notificationComparisonOperatorValue
                        : null,

                notificationComparisonValue:
                    isNotificationEnabled
                        ? notificationComparisonValueNumber
                        : null,

                notificationAction:
                    isNotificationEnabled
                        ? (
                            notificationAction
                                ? String(
                                    notificationAction
                                ).trim()
                                : null
                        )
                        : null,

                notificationTemplate:
                    isNotificationEnabled
                        ? (
                            notificationTemplate
                                ? String(
                                    notificationTemplate
                                ).trim()
                                : null
                        )
                        : null,


                // Pin verification
                enablePinVerification:
                    enablePinVerification === true ||
                    enablePinVerification === "true"
            });


        // =================================================
        // RESPONSE
        // =================================================

        return res.status(201).json({
            message:
                "Loyalty program created successfully",

            loyaltyProgram: {
                id:
                    loyaltyProgram.id,

                vendorId:
                    loyaltyProgram.vendorId,

                image:
                    loyaltyProgram.image,

                programName:
                    loyaltyProgram.programName,

                requiredStarCollection:
                    loyaltyProgram.requiredStarCollection,

                qrCodeScanIntervalValue:
                    loyaltyProgram.qrCodeScanIntervalValue,

                qrCodeScanIntervalUnit:
                    loyaltyProgram.qrCodeScanIntervalUnit,

                programRules:
                    loyaltyProgram.programRules,


                notificationEnabled:
                    loyaltyProgram.notificationEnabled,

                notificationStarField:
                    loyaltyProgram.notificationStarField,

                notificationConditionOperator:
                    loyaltyProgram.notificationConditionOperator,

                notificationComparisonOperator:
                    loyaltyProgram.notificationComparisonOperator,

                notificationComparisonValue:
                    loyaltyProgram.notificationComparisonValue,

                notificationAction:
                    loyaltyProgram.notificationAction,

                notificationTemplate:
                    loyaltyProgram.notificationTemplate,


                enablePinVerification:
                    loyaltyProgram.enablePinVerification,

                createdAt:
                    loyaltyProgram.createdAt
            }
        });

    } catch (error) {

        console.error(
            "Create loyalty program error:",
            error
        );

        return res.status(500).json({
            message:
                "Something went wrong"
        });
    }
}


// =====================================================
// GET 5 RECENT LOYALTY PROGRAMS
// =====================================================

async function getRecentLoyaltyPrograms(
    req,
    res
) {
    try {

        // Vendor ID from JWT
        const vendorId =
            req.user.id;


        const loyaltyPrograms =
            await LoyaltyProgram.findAll({

                where: {
                    vendorId
                },

                order: [
                    [
                        "createdAt",
                        "DESC"
                    ]
                ],

                limit: 5
            });


        return res.status(200).json({
            message:
                "Recent loyalty programs fetched successfully",

            count:
                loyaltyPrograms.length,

            loyaltyPrograms
        });

    } catch (error) {

        console.error(
            "Get recent loyalty programs error:",
            error
        );

        return res.status(500).json({
            message:
                "Something went wrong"
        });
    }
}


// =====================================================
// GET ALL LOYALTY PROGRAMS
// =====================================================

async function getAllLoyaltyPrograms(
    req,
    res
) {
    try {

        // Vendor ID from JWT
        const vendorId =
            req.user.id;


        const loyaltyPrograms =
            await LoyaltyProgram.findAll({

                where: {
                    vendorId
                },

                order: [
                    [
                        "createdAt",
                        "DESC"
                    ]
                ]
            });


        return res.status(200).json({
            message:
                "Loyalty programs fetched successfully",

            count:
                loyaltyPrograms.length,

            loyaltyPrograms
        });

    } catch (error) {

        console.error(
            "Get all loyalty programs error:",
            error
        );

        return res.status(500).json({
            message:
                "Something went wrong"
        });
    }
}


module.exports = {
    createLoyaltyProgram,
    getRecentLoyaltyPrograms,
    getAllLoyaltyPrograms
};