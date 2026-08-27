const {
    UserRole,
    Role
} = require("../models");


// =====================================================
// GENERIC ROLE AUTHORIZATION
// =====================================================

const authorizeRoles = (...allowedRoles) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    message:
                        "Authentication required."
                });
            }

            const assignment =
                await UserRole.findOne({
                    where: {
                        userId: req.user.id
                    },

                    include: [
                        {
                            model: Role,
                            as: "role",

                            where: {
                                name: allowedRoles
                            },

                            attributes: [
                                "id",
                                "name"
                            ]
                        }
                    ]
                });

            if (!assignment) {
                return res.status(403).json({
                    message:
                        "You do not have permission to access this resource."
                });
            }

            next();

        } catch (error) {
            console.error(
                "Role authorization error:",
                error
            );

            return res.status(500).json({
                message:
                    "Internal server error."
            });
        }
    };
};


// =====================================================
// USER ACCESS
// =====================================================
//
// A vendor with an active USER role can also use
// customer/user APIs.
//
// =====================================================

const authorizeUser = authorizeRoles(
    "user"
);


// =====================================================
// SUPERADMIN ACCESS
// =====================================================

const authorizeSuperadmin =
    authorizeRoles(
        "superadmin"
    );


// =====================================================
// VENDOR ACCESS
// =====================================================
//
// Vendor access has an additional requirement:
//
// suspended = false
//
// suspended = true
//     => 403
//
// suspended = false
//     => allowed
//
// =====================================================

const authorizeVendor = async (
    req,
    res,
    next
) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                message:
                    "Authentication required."
            });
        }

        const vendorAssignment =
            await UserRole.findOne({
                where: {
                    userId: req.user.id,
                    suspended: false
                },

                include: [
                    {
                        model: Role,
                        as: "role",

                        where: {
                            name: "vendor"
                        },

                        attributes: [
                            "id",
                            "name"
                        ]
                    }
                ]
            });


        if (!vendorAssignment) {
            // Check whether the user is a vendor
            const vendorRole =
                await UserRole.findOne({
                    where: {
                        userId:
                            req.user.id
                    },

                    include: [
                        {
                            model: Role,
                            as: "role",

                            where: {
                                name: "vendor"
                            },

                            attributes: [
                                "id",
                                "name"
                            ]
                        }
                    ]
                });


            if (vendorRole) {
                return res.status(403).json({
                    message:
                        "Vendor access is suspended."
                });
            }

            return res.status(403).json({
                message:
                    "Vendor role is required."
            });
        }


        next();

    } catch (error) {
        console.error(
            "Vendor authorization error:",
            error
        );

        return res.status(500).json({
            message:
                "Internal server error."
        });
    }
};


module.exports = {
    authorizeRoles,
    authorizeUser,
    authorizeSuperadmin,
    authorizeVendor
};