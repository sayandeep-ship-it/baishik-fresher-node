const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const {
    User,
    Role,
    UserRole,
    VendorDetails
} = require("../models");


// =====================================================
// HELPERS
// =====================================================

const normalizeEmail = (email) => {
    return email
        .trim()
        .toLowerCase();
};


// =====================================================
// VENDOR LOGIN
// =====================================================
//
// POST /api/vendor/login
//
// Requirements:
//
// 1. User exists
// 2. Account is active
// 3. Vendor role exists in user_roles
// 4. Vendor suspended = false
// 5. Password is correct
//
// Then:
//
// vendor_details.hasAddress
//
// true  -> normal login
// false -> requiresAddress = true
//
// =====================================================

exports.login = async (
    req,
    res
) => {
    try {

        const {
            email,
            password
        } = req.body;


        // =================================================
        // VALIDATION
        // =================================================

        if (
            !email ||
            !password
        ) {
            return res.status(400).json({
                message:
                    "Email and password are required."
            });
        }


        const normalizedEmail =
            normalizeEmail(
                email
            );


        // =================================================
        // FIND USER
        // =================================================

        const user =
            await User.findOne({
                where: {
                    email:
                        normalizedEmail
                }
            });


        if (!user) {
            return res.status(401).json({
                message:
                    "Invalid email or password."
            });
        }


        // =================================================
        // ACCOUNT STATUS
        // =================================================

        if (!user.isActive) {
            return res.status(403).json({
                message:
                    "Please verify your email before logging in."
            });
        }


        // =================================================
        // FIND VENDOR ROLE
        // =================================================

        const vendorRole =
            await Role.findOne({
                where: {
                    name:
                        "vendor"
                }
            });


        if (!vendorRole) {
            return res.status(500).json({
                message:
                    "Vendor role is not configured."
            });
        }


        // =================================================
        // FIND VENDOR ASSIGNMENT
        // =================================================
        //
        // MANDATORY user_roles CHECK
        //
        // =================================================

        const vendorAssignment =
            await UserRole.findOne({
                where: {
                    userId:
                        user.id,

                    roleId:
                        vendorRole.id
                }
            });


        // =================================================
        // NOT A VENDOR
        // =================================================

        if (!vendorAssignment) {
            return res.status(403).json({
                message:
                    "Vendor role is required."
            });
        }


        // =================================================
        // SUSPENDED VENDOR
        // =================================================

        if (
            vendorAssignment.suspended
        ) {
            return res.status(403).json({
                message:
                    "Vendor account is suspended."
            });
        }


        // =================================================
        // PASSWORD
        // =================================================

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );


        if (!passwordMatch) {
            return res.status(401).json({
                message:
                    "Invalid email or password."
            });
        }


        // =================================================
        // LOAD ACTIVE ROLES
        // =================================================

        const roleAssignments =
            await UserRole.findAll({
                where: {
                    userId:
                        user.id,

                    suspended:
                        false
                },

                include: [
                    {
                        model:
                            Role,

                        as:
                            "role",

                        attributes: [
                            "name"
                        ]
                    }
                ]
            });


        const roles =
            roleAssignments.map(
                (assignment) =>
                    assignment.role.name
            );


        // =================================================
        // JWT
        // =================================================

        const token =
            jwt.sign(
                {
                    id:
                        user.id,

                    roles:
                        roles
                },

                process.env.JWT_SECRET,

                {
                    expiresIn:
                        process.env.JWT_EXPIRES_IN ||
                        "1d"
                }
            );


        // =================================================
        // FIND VENDOR DETAILS
        // =================================================

        let vendorDetails =
            await VendorDetails.findOne({
                where: {
                    userId:
                        user.id
                }
            });


        // =================================================
        // CREATE DEFAULT VENDOR DETAILS
        // =================================================

        if (!vendorDetails) {

            vendorDetails =
                await VendorDetails.create({
                    userId:
                        user.id,

                    hasAddress:
                        false
                });
        }


        // =================================================
        // ADDRESS EXISTS
        // =================================================

        if (
            vendorDetails.hasAddress
        ) {

            return res.status(200).json({

                success:
                    true,

                message:
                    "Vendor login successful.",

                token,

                requiresAddress:
                    false,

                redirectTo:
                    null,

                user: {

                    id:
                        user.id,

                    firstName:
                        user.firstName,

                    lastName:
                        user.lastName,

                    email:
                        user.email,

                    roles:
                        roles
                }
            });
        }


        // =================================================
        // ADDRESS DOES NOT EXIST
        // =================================================

        return res.status(200).json({

            success:
                true,

            message:
                "Login successful. Please complete your vendor address details.",

            token,

            requiresAddress:
                true,

            redirectTo:
                "/vendor/address",

            user: {

                id:
                    user.id,

                firstName:
                    user.firstName,

                lastName:
                    user.lastName,

                email:
                    user.email,

                roles:
                    roles
            }
        });

    } catch (error) {

        console.error(
            "Vendor login error:",
            error
        );

        return res.status(500).json({
            message:
                "Internal server error."
        });
    }
};


// =====================================================
// SAVE / UPDATE VENDOR ADDRESS
// =====================================================
//
// POST /api/vendor/address
//
// Requires authenticated active vendor.
//
// =====================================================

exports.saveAddress = async (
    req,
    res
) => {
    try {

        const {
            streetAddress,
            city,
            country,
            state,
            pinCode
        } = req.body;


        // =================================================
        // VALIDATION
        // =================================================

        if (
            !streetAddress ||
            !city ||
            !country ||
            !state ||
            !pinCode
        ) {
            return res.status(400).json({
                message:
                    "Street address, city, country, state and pin code are required."
            });
        }


        // =================================================
        // USER ID FROM JWT
        // =================================================

        const userId =
            req.user.id;


        // =================================================
        // FIND VENDOR ROLE
        // =================================================

        const vendorRole =
            await Role.findOne({
                where: {
                    name:
                        "vendor"
                }
            });


        if (!vendorRole) {
            return res.status(500).json({
                message:
                    "Vendor role is not configured."
            });
        }


        // =================================================
        // ACTIVE VENDOR
        // =================================================

        const vendorAssignment =
            await UserRole.findOne({
                where: {
                    userId:
                        userId,

                    roleId:
                        vendorRole.id,

                    suspended:
                        false
                }
            });


        if (!vendorAssignment) {
            return res.status(403).json({
                message:
                    "Active vendor role is required."
            });
        }


        // =================================================
        // FIND EXISTING DETAILS
        // =================================================

        let vendorDetails =
            await VendorDetails.findOne({
                where: {
                    userId:
                        userId
                }
            });


        // =================================================
        // CREATE
        // =================================================

        if (!vendorDetails) {

            vendorDetails =
                await VendorDetails.create({

                    userId:
                        userId,

                    hasAddress:
                        true,

                    streetAddress:
                        streetAddress.trim(),

                    city:
                        city.trim(),

                    country:
                        country.trim(),

                    state:
                        state.trim(),

                    pinCode:
                        pinCode.trim()
                });

        } else {

            // =============================================
            // UPDATE
            // =============================================

            vendorDetails.streetAddress =
                streetAddress.trim();

            vendorDetails.city =
                city.trim();

            vendorDetails.country =
                country.trim();

            vendorDetails.state =
                state.trim();

            vendorDetails.pinCode =
                pinCode.trim();

            vendorDetails.hasAddress =
                true;


            await vendorDetails.save();
        }


        // =================================================
        // RESPONSE
        // =================================================

        return res.status(200).json({

            success:
                true,

            message:
                "Vendor address saved successfully.",

            vendorDetails: {

                hasAddress:
                    vendorDetails.hasAddress,

                streetAddress:
                    vendorDetails.streetAddress,

                city:
                    vendorDetails.city,

                country:
                    vendorDetails.country,

                state:
                    vendorDetails.state,

                pinCode:
                    vendorDetails.pinCode
            }
        });

    } catch (error) {

        console.error(
            "Save vendor address error:",
            error
        );

        return res.status(500).json({
            message:
                "Internal server error."
        });
    }
};


// =====================================================
// GET VENDOR ADDRESS
// =====================================================
//
// GET /api/vendor/address
//
// =====================================================

exports.getAddress = async (
    req,
    res
) => {
    try {

        const vendorDetails =
            await VendorDetails.findOne({
                where: {
                    userId:
                        req.user.id
                }
            });


        if (!vendorDetails) {

            return res.status(200).json({

                hasAddress:
                    false,

                vendorDetails:
                    null
            });
        }


        return res.status(200).json({

            hasAddress:
                vendorDetails.hasAddress,

            vendorDetails: {

                streetAddress:
                    vendorDetails.streetAddress,

                city:
                    vendorDetails.city,

                country:
                    vendorDetails.country,

                state:
                    vendorDetails.state,

                pinCode:
                    vendorDetails.pinCode
            }
        });

    } catch (error) {

        console.error(
            "Get vendor address error:",
            error
        );

        return res.status(500).json({
            message:
                "Internal server error."
        });
    }
};


// =====================================================
// VENDOR CHANGE PASSWORD
// =====================================================
//
// PATCH /api/vendor/change-password
//
// Vendor must already be logged in.
//
// Authorization:
// Bearer <vendor JWT>
//
// Body:
//
// {
//     "newPassword": "NewPassword123"
// }
//
// IMPORTANT:
//
// User ID comes from:
//
// req.user.id
//
// No:
// - email
// - userId
// - OTP
// - resetToken
//
// =====================================================

exports.changeVendorPassword = async (
    req,
    res
) => {
    try {

        const {
            newPassword
        } = req.body;


        // =================================================
        // VALIDATION
        // =================================================

        if (!newPassword) {

            return res.status(400).json({
                message:
                    "New password is required."
            });
        }


        if (
            typeof newPassword !== "string" ||
            newPassword.length < 8
        ) {

            return res.status(400).json({
                message:
                    "Password must contain at least 8 characters."
            });
        }


        // =================================================
        // USER ID FROM JWT
        // =================================================

        const userId =
            req.user.id;


        // =================================================
        // FIND USER
        // =================================================

        const user =
            await User.findByPk(
                userId
            );


        if (!user) {

            return res.status(404).json({
                message:
                    "User not found."
            });
        }


        // =================================================
        // ACCOUNT STATUS
        // =================================================

        if (!user.isActive) {

            return res.status(403).json({
                message:
                    "Account is inactive."
            });
        }


        // =================================================
        // FIND VENDOR ROLE
        // =================================================

        const vendorRole =
            await Role.findOne({
                where: {
                    name:
                        "vendor"
                }
            });


        if (!vendorRole) {

            return res.status(500).json({
                message:
                    "Vendor role is not configured."
            });
        }


        // =================================================
        // ACTIVE VENDOR ASSIGNMENT
        // =================================================

        const vendorAssignment =
            await UserRole.findOne({
                where: {

                    userId:
                        userId,

                    roleId:
                        vendorRole.id,

                    suspended:
                        false
                }
            });


        if (!vendorAssignment) {

            return res.status(403).json({
                message:
                    "Active vendor role is required."
            });
        }


        // =================================================
        // HASH NEW PASSWORD
        // =================================================

        const hashedPassword =
            await bcrypt.hash(
                newPassword,
                12
            );


        // =================================================
        // SAVE
        // =================================================

        user.password =
            hashedPassword;


        await user.save();


        // =================================================
        // RESPONSE
        // =================================================

        return res.status(200).json({

            success:
                true,

            message:
                "Vendor password changed successfully."
        });

    } catch (error) {

        console.error(
            "Vendor change password error:",
            error
        );

        return res.status(500).json({
            message:
                "Internal server error."
        });
    }
};