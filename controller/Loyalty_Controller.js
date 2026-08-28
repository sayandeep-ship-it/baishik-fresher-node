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

            // =================================================
            // NOTIFICATION
            // =================================================

            notificationEnabled,

            notificationStarField,

            notificationConditionOperator,

            notificationComparisonOperator,

            notificationComparisonValue,

            notificationAction,

            notificationTemplate,

            // =================================================
            // PIN
            // =================================================

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
        // INTERVAL UNIT
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

        let imagePath =
            null;


        if (req.file) {

            imagePath =
                `/uploads/loyalty/${req.file.filename}`;
        }


        // =================================================
        // NOTIFICATION SETTINGS
        // =================================================

        const isNotificationEnabled =
            notificationEnabled === true ||
            notificationEnabled === "true";


        // =================================================
        // DEFAULT VALUES
        // =================================================
        //
        // Everything is NULL until notificationEnabled
        // is explicitly enabled.
        //
        // =================================================

        let notificationStarFieldValue =
            null;

        let notificationConditionOperatorValue =
            null;

        let notificationComparisonOperatorValue =
            null;

        let notificationComparisonValueNumber =
            null;

        let notificationActionValue =
            null;

        let notificationTemplateValue =
            null;


        // =================================================
        // NOTIFICATION ENABLED
        // =================================================

        if (
            isNotificationEnabled
        ) {

            // ---------------------------------------------
            // STAR FIELD
            // ---------------------------------------------

            notificationStarFieldValue =
                notificationStarField
                    ? String(
                        notificationStarField
                    ).trim()
                    : "STAR_COUNT";


            // ---------------------------------------------
            // CONDITION OPERATOR
            // ---------------------------------------------

            if (
                !notificationConditionOperator
            ) {
                return res.status(400).json({
                    message:
                        "Notification condition operator is required when notifications are enabled"
                });
            }


            notificationConditionOperatorValue =
                String(
                    notificationConditionOperator
                ).toUpperCase();


            const allowedConditionOperators = [
                "LESS_THAN",
                "GREATER_THAN",
                "EQUAL_TO",
                "LESS_THAN_OR_EQUAL",
                "GREATER_THAN_OR_EQUAL"
            ];


            if (
                !allowedConditionOperators.includes(
                    notificationConditionOperatorValue
                )
            ) {
                return res.status(400).json({
                    message:
                        "Invalid notification condition operator"
                });
            }


            // ---------------------------------------------
            // COMPARISON OPERATOR
            // ---------------------------------------------

            if (
                !notificationComparisonOperator
            ) {
                return res.status(400).json({
                    message:
                        "Notification comparison operator is required when notifications are enabled"
                });
            }


            notificationComparisonOperatorValue =
                String(
                    notificationComparisonOperator
                ).toUpperCase();


            const allowedComparisonOperators = [
                "EQUAL_TO",
                "NOT_EQUAL_TO",
                "LESS_THAN",
                "GREATER_THAN",
                "LESS_THAN_OR_EQUAL",
                "GREATER_THAN_OR_EQUAL"
            ];


            if (
                !allowedComparisonOperators.includes(
                    notificationComparisonOperatorValue
                )
            ) {
                return res.status(400).json({
                    message:
                        "Invalid notification comparison operator"
                });
            }


            // ---------------------------------------------
            // COMPARISON VALUE
            // ---------------------------------------------

            if (
                notificationComparisonValue ===
                    undefined ||
                notificationComparisonValue ===
                    null ||
                notificationComparisonValue ===
                    ""
            ) {
                return res.status(400).json({
                    message:
                        "Notification comparison value is required when notifications are enabled"
                });
            }


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


            // ---------------------------------------------
            // ACTION
            // ---------------------------------------------

            if (
                !notificationAction
            ) {
                return res.status(400).json({
                    message:
                        "Notification action is required when notifications are enabled"
                });
            }


            notificationActionValue =
                String(
                    notificationAction
                ).trim();


            // ---------------------------------------------
            // TEMPLATE
            // ---------------------------------------------

            if (
                !notificationTemplate
            ) {
                return res.status(400).json({
                    message:
                        "Notification template is required when notifications are enabled"
                });
            }


            notificationTemplateValue =
                String(
                    notificationTemplate
                ).trim();
        }


        // =================================================
        // CREATE LOYALTY PROGRAM
        // =================================================

        const loyaltyProgram =
            await LoyaltyProgram.create({

                // -----------------------------------------
                // Vendor
                // -----------------------------------------

                vendorId:
                    vendorId,


                // -----------------------------------------
                // Image
                // -----------------------------------------

                image:
                    imagePath,


                // -----------------------------------------
                // Program
                // -----------------------------------------

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


                // =========================================
                // NOTIFICATION
                // =========================================
                //
                // When false:
                //
                // all these values are NULL.
                //
                // When true:
                //
                // validated values are stored.
                //
                // =========================================

                notificationEnabled:
                    isNotificationEnabled,

                notificationStarField:
                    notificationStarFieldValue,

                notificationConditionOperator:
                    notificationConditionOperatorValue,

                notificationComparisonOperator:
                    notificationComparisonOperatorValue,

                notificationComparisonValue:
                    notificationComparisonValueNumber,

                notificationAction:
                    notificationActionValue,

                notificationTemplate:
                    notificationTemplateValue,


                // -----------------------------------------
                // PIN VERIFICATION
                // -----------------------------------------

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


                // Notification
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

        const vendorId =
            req.user.id;


        const loyaltyPrograms =
            await LoyaltyProgram.findAll({

                where: {
                    vendorId:
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

        const vendorId =
            req.user.id;


        const loyaltyPrograms =
            await LoyaltyProgram.findAll({

                where: {
                    vendorId:
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