const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const {
    User,
    Role,
    UserRole,
    VendorDetails
} = require("../models");

const {
    sendOTP
} = require("../services/emailService");


// =====================================================
// HELPERS
// =====================================================

const normalizeEmail = (email) => {
    return email.trim().toLowerCase();
};


const generateOTP = () => {
    const crypto = require("crypto");

    return crypto
        .randomInt(100000, 1000000)
        .toString();
};


const getOTPExpiry = () => {
    const minutes =
        Number(
            process.env.OTP_EXPIRY_MINUTES || 10
        );

    return new Date(
        Date.now() +
        minutes * 60 * 1000
    );
};


// =====================================================
// VENDOR LOGIN
// =====================================================
//
// POST /api/vendor/login
//
// Body:
//
// {
//     "email": "vendor@example.com",
//     "password": "password123"
// }
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


        if (!email || !password) {
            return res.status(400).json({
                message:
                    "Email and password are required."
            });
        }


        const normalizedEmail =
            normalizeEmail(email);


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
        // LOAD VENDOR ROLE ASSIGNMENT
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
        // USER IS NOT A VENDOR
        // =================================================

        if (!vendorAssignment) {
            return res.status(403).json({
                message:
                    "Vendor role is required."
            });
        }


        // =================================================
        // VENDOR SUSPENDED
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
        // USER ACCOUNT STATUS
        // =================================================

        if (!user.isActive) {
            return res.status(403).json({
                message:
                    "Account is inactive. Please verify your email."
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
        // LOAD ALL ACTIVE ROLES
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
                assignment =>
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
        // CREATE VENDOR DETAILS IF MISSING
        // =================================================
        //
        // This protects existing vendors created before
        // vendor_details was introduced.
        //

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
        // HAS ADDRESS
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
        // NO ADDRESS
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
// Body:
//
// {
//     "streetAddress": "123 Park Street",
//     "city": "Kolkata",
//     "country": "India",
//     "state": "West Bengal",
//     "pinCode": "700016"
// }
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


        const userId =
            req.user.id;


        // =================================================
        // VERIFY ACTIVE VENDOR
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
        // CREATE OR UPDATE
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
// VENDOR FORGOT PASSWORD
// =====================================================
//
// POST /api/vendor/forgot-password
//
// This uses the SAME OTP storage:
//
// users.otp
// users.otpExpiry
//
// No hashing is used for the OTP.
//
// =====================================================

exports.forgotPassword = async (
    req,
    res
) => {
    try {
        const {
            email
        } = req.body;


        if (!email) {
            return res.status(400).json({
                message:
                    "Email is required."
            });
        }


        const normalizedEmail =
            normalizeEmail(email);


        const user =
            await User.findOne({
                where: {
                    email:
                        normalizedEmail
                }
            });


        if (!user) {
            return res.status(404).json({
                message:
                    "User not found."
            });
        }


        if (!user.isActive) {
            return res.status(403).json({
                message:
                    "Account is inactive."
            });
        }


        // =================================================
        // CHECK VENDOR ROLE
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


        const vendorAssignment =
            await UserRole.findOne({
                where: {
                    userId:
                        user.id,

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
        // GENERATE OTP
        // =================================================

        const otp =
            generateOTP();

        const otpExpiry =
            getOTPExpiry();


        // =================================================
        // STORE OTP DIRECTLY
        // =================================================

        user.otp =
            otp;

        user.otpExpiry =
            otpExpiry;


        await user.save();


        // =================================================
        // SEND OTP
        // =================================================

        await sendOTP(
            normalizedEmail,
            otp,
            "Vendor Password Reset OTP"
        );


        return res.status(200).json({
            message:
                "Password reset OTP has been sent to your email."
        });

    } catch (error) {
        console.error(
            "Vendor forgot password error:",
            error
        );

        return res.status(500).json({
            message:
                "Internal server error."
        });
    }
};