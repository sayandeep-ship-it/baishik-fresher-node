const {
    User,
    Role,
    UserRole
} = require("../models");


// =====================================================
// APPOINT USER AS VENDOR
// =====================================================
//
// Only an authenticated superadmin can reach this
// controller because the route is protected by:
// authenticate + authorizeSuperadmin
//
// =====================================================

exports.appointVendor = async (
    req,
    res
) => {
    try {
        const {
            userId
        } = req.params;


        // =================================================
        // FIND TARGET USER
        // =================================================

        const targetUser =
            await User.findByPk(
                userId
            );

        if (!targetUser) {
            return res.status(404).json({
                message:
                    "User not found."
            });
        }


        // =================================================
        // FIND VENDOR ROLE
        // =================================================

        const vendorRole =
            await Role.findOne({
                where: {
                    name: "vendor"
                }
            });

        if (!vendorRole) {
            return res.status(500).json({
                message:
                    "Vendor role is not configured."
            });
        }


        // =================================================
        // FIND EXISTING VENDOR ASSIGNMENT
        // =================================================

        let vendorAssignment =
            await UserRole.findOne({
                where: {
                    userId:
                        targetUser.id,

                    roleId:
                        vendorRole.id
                }
            });


        // =================================================
        // IF ROLE ALREADY EXISTS
        // =================================================

        if (vendorAssignment) {

            // Already active
            if (
                !vendorAssignment.suspended
            ) {
                return res.status(409).json({
                    message:
                        "User is already an active vendor."
                });
            }


            // Re-activate suspended vendor
            vendorAssignment.suspended =
                false;

            vendorAssignment.suspendedAt =
                null;

            vendorAssignment.assignedBy =
                req.user.id;

            vendorAssignment.assignedAt =
                new Date();

            await vendorAssignment.save();

            return res.status(200).json({
                message:
                    "Vendor role reactivated successfully.",

                user: {
                    id:
                        targetUser.id,

                    email:
                        targetUser.email
                },

                role: {
                    name: "vendor",

                    suspended: false
                }
            });
        }


        // =================================================
        // CREATE VENDOR ROLE ASSIGNMENT
        // =================================================

        vendorAssignment =
            await UserRole.create({
                userId:
                    targetUser.id,

                roleId:
                    vendorRole.id,

                suspended: false,

                assignedBy:
                    req.user.id,

                assignedAt:
                    new Date()
            });


        return res.status(201).json({
            message:
                "User appointed as vendor successfully.",

            user: {
                id:
                    targetUser.id,

                email:
                    targetUser.email
            },

            role: {
                name: "vendor",

                suspended:
                    vendorAssignment.suspended
            }
        });

    } catch (error) {
        console.error(
            "Appoint vendor error:",
            error
        );

        return res.status(500).json({
            message:
                "Internal server error."
        });
    }
};


// =====================================================
// SUSPEND VENDOR
// =====================================================

exports.suspendVendor = async (
    req,
    res
) => {
    try {
        const {
            userId
        } = req.params;


        const vendorRole =
            await Role.findOne({
                where: {
                    name: "vendor"
                }
            });

        if (!vendorRole) {
            return res.status(500).json({
                message:
                    "Vendor role is not configured."
            });
        }


        const vendorAssignment =
            await UserRole.findOne({
                where: {
                    userId:
                        userId,

                    roleId:
                        vendorRole.id
                }
            });


        if (!vendorAssignment) {
            return res.status(404).json({
                message:
                    "Vendor role assignment not found."
            });
        }


        if (
            vendorAssignment.suspended
        ) {
            return res.status(400).json({
                message:
                    "Vendor is already suspended."
            });
        }


        vendorAssignment.suspended =
            true;

        vendorAssignment.suspendedAt =
            new Date();

        await vendorAssignment.save();


        return res.status(200).json({
            message:
                "Vendor suspended successfully.",

            userId:
                Number(userId),

            role: {
                name: "vendor",

                suspended: true
            }
        });

    } catch (error) {
        console.error(
            "Suspend vendor error:",
            error
        );

        return res.status(500).json({
            message:
                "Internal server error."
        });
    }
};


// =====================================================
// ACTIVATE VENDOR
// =====================================================

exports.activateVendor = async (
    req,
    res
) => {
    try {
        const {
            userId
        } = req.params;


        const vendorRole =
            await Role.findOne({
                where: {
                    name: "vendor"
                }
            });

        if (!vendorRole) {
            return res.status(500).json({
                message:
                    "Vendor role is not configured."
            });
        }


        const vendorAssignment =
            await UserRole.findOne({
                where: {
                    userId:
                        userId,

                    roleId:
                        vendorRole.id
                }
            });


        if (!vendorAssignment) {
            return res.status(404).json({
                message:
                    "Vendor role assignment not found."
            });
        }


        vendorAssignment.suspended =
            false;

        vendorAssignment.suspendedAt =
            null;

        await vendorAssignment.save();


        return res.status(200).json({
            message:
                "Vendor activated successfully.",

            userId:
                Number(userId),

            role: {
                name: "vendor",

                suspended: false
            }
        });

    } catch (error) {
        console.error(
            "Activate vendor error:",
            error
        );

        return res.status(500).json({
            message:
                "Internal server error."
        });
    }
};