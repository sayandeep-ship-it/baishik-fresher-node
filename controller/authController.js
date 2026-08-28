const crypto = require("crypto");
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

const generateOTP = () => {
    return crypto
        .randomInt(
            100000,
            1000000
        )
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


const normalizeEmail = (email) => {
    return email
        .trim()
        .toLowerCase();
};


const validatePassword = (password) => {
    return (
        typeof password === "string" &&
        password.length >= 8
    );
};


// =====================================================
// GET ROLE
// =====================================================

const getRoleByName = async (roleName) => {
    return await Role.findOne({
        where: {
            name: roleName
        }
    });
};


// =====================================================
// GET USER ROLE ASSIGNMENTS
// =====================================================
//
// Returns:
//
// [
//     {
//         role: "user",
//         suspended: false
//     },
//     {
//         role: "vendor",
//         suspended: false
//     }
// ]
//
// =====================================================

const getUserRoleAssignments = async (
    userId
) => {
    const assignments =
        await UserRole.findAll({
            where: {
                userId
            },

            include: [
                {
                    model: Role,
                    as: "role",
                    attributes: [
                        "id",
                        "name"
                    ]
                }
            ]
        });

    return assignments.map(
        (assignment) => {
            return {
                role:
                    assignment.role.name,

                suspended:
                    assignment.suspended
            };
        }
    );
};


// =====================================================
// GET ACTIVE ROLE NAMES
// =====================================================
//
// IMPORTANT:
//
// Only roles where:
//
// suspended = false
//
// are included in the JWT.
//
// JWT:
//
// {
//     id: user.id,
//     roles: ["user", "vendor"]
// }
//
// =====================================================

const getActiveRoleNames = async (
    userId
) => {
    const assignments =
        await UserRole.findAll({
            where: {
                userId,
                suspended: false
            },

            include: [
                {
                    model: Role,
                    as: "role",
                    attributes: [
                        "name"
                    ]
                }
            ]
        });

    return assignments.map(
        (assignment) =>
            assignment.role.name
    );
};


// =====================================================
// CREATE ACCESS TOKEN
// =====================================================
//
// JWT:
//
// {
//     id: user.id,
//     roles: ["user", "vendor"]
// }
//
// =====================================================

const createAccessToken = async (
    user
) => {
    const roles =
        await getActiveRoleNames(
            user.id
        );

    return jwt.sign(
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
};


// =====================================================
// REGISTER NORMAL USER
// =====================================================
//
// Public registration ONLY creates / assigns USER.
//
// Vendor cannot self-register as vendor.
//
// If a vendor already exists with the same email:
// - existing password must match
// - USER role is added
// - second users row is NOT created
//
// =====================================================

exports.register = async (
    req,
    res
) => {
    try {

        const {
            firstName,
            lastName,
            email,
            password
        } = req.body;


        // =================================================
        // VALIDATION
        // =================================================

        if (
            !firstName ||
            !lastName ||
            !email ||
            !password
        ) {
            return res.status(400).json({
                message:
                    "First name, last name, email and password are required."
            });
        }


        if (
            !validatePassword(
                password
            )
        ) {
            return res.status(400).json({
                message:
                    "Password must contain at least 8 characters."
            });
        }


        const normalizedFirstName =
            firstName.trim();

        const normalizedLastName =
            lastName.trim();

        const normalizedEmail =
            normalizeEmail(
                email
            );


        // =================================================
        // FIND EXISTING USER
        // =================================================

        const existingUser =
            await User.findOne({
                where: {
                    email:
                        normalizedEmail
                }
            });


        // =================================================
        // EXISTING ACCOUNT
        // =================================================

        if (existingUser) {

            const assignments =
                await getUserRoleAssignments(
                    existingUser.id
                );


            const hasUserRole =
                assignments.some(
                    (assignment) =>
                        assignment.role ===
                        "user"
                );


            const hasVendorRole =
                assignments.some(
                    (assignment) =>
                        assignment.role ===
                        "vendor"
                );


            // ---------------------------------------------
            // Existing USER
            // ---------------------------------------------

            if (hasUserRole) {
                return res.status(409).json({
                    message:
                        "An account with this email already exists."
                });
            }


            // ---------------------------------------------
            // Existing VENDOR
            //
            // Add USER role to same identity.
            // ---------------------------------------------

            if (hasVendorRole) {

                const passwordMatches =
                    await bcrypt.compare(
                        password,
                        existingUser.password
                    );


                if (!passwordMatches) {
                    return res.status(401).json({
                        message:
                            "An account already exists with this email. Use the existing account password."
                    });
                }


                const userRole =
                    await getRoleByName(
                        "user"
                    );


                if (!userRole) {
                    return res.status(500).json({
                        message:
                            "User role is not configured."
                    });
                }


                const existingUserRole =
                    await UserRole.findOne({
                        where: {
                            userId:
                                existingUser.id,

                            roleId:
                                userRole.id
                        }
                    });


                if (!existingUserRole) {

                    await UserRole.create({
                        userId:
                            existingUser.id,

                        roleId:
                            userRole.id,

                        suspended:
                            false,

                        assignedBy:
                            null,

                        assignedAt:
                            new Date()
                    });

                } else if (
                    existingUserRole.suspended
                ) {

                    existingUserRole.suspended =
                        false;

                    existingUserRole.suspendedAt =
                        null;

                    await existingUserRole.save();
                }


                return res.status(200).json({
                    message:
                        "User role added successfully. You can use the same account as a customer and vendor."
                });
            }


            return res.status(409).json({
                message:
                    "An account with this email already exists."
            });
        }


        // =================================================
        // GET USER ROLE
        // =================================================

        const userRole =
            await getRoleByName(
                "user"
            );


        if (!userRole) {
            return res.status(500).json({
                message:
                    "Default user role is not configured."
            });
        }


        // =================================================
        // HASH PASSWORD
        // =================================================

        const hashedPassword =
            await bcrypt.hash(
                password,
                12
            );


        // =================================================
        // GENERATE OTP
        // =================================================

        const otp =
            generateOTP();

        const otpExpiry =
            getOTPExpiry();


        // =================================================
        // CREATE USER
        // =================================================

        const user =
            await User.create({

                firstName:
                    normalizedFirstName,

                lastName:
                    normalizedLastName,

                email:
                    normalizedEmail,

                password:
                    hashedPassword,

                isActive:
                    false,

                emailVerifiedAt:
                    null,

                // OTP stored directly
                otp:
                    otp,

                otpExpiry:
                    otpExpiry,

                passwordResetVersion:
                    0
            });


        // =================================================
        // ASSIGN USER ROLE
        // =================================================

        await UserRole.create({

            userId:
                user.id,

            roleId:
                userRole.id,

            suspended:
                false,

            assignedBy:
                null,

            assignedAt:
                new Date()
        });


        // =================================================
        // SEND VERIFICATION OTP
        // =================================================

        try {

            await sendOTP(
                normalizedEmail,
                otp,
                "Verify Your Account"
            );

        } catch (emailError) {

            // User MUST remain in DB.

            console.error(
                "Registration email error:",
                emailError
            );

            return res.status(201).json({
                message:
                    "Account created successfully, but the verification email could not be sent. Please request a new OTP."
            });
        }


        return res.status(201).json({
            message:
                "Registration successful. Please verify your email using the OTP sent to your email."
        });

    } catch (error) {

        console.error(
            "Register error:",
            error
        );

        return res.status(500).json({
            message:
                "Internal server error."
        });
    }
};


// =====================================================
// VERIFY OTP
// =====================================================
//
// ONE ROUTE:
//
// POST /api/auth/verify-otp
//
// otpPurpose:
//
// emailVerification
// forgotPassword
//
// OTP IS STORED DIRECTLY.
// NO HASHING.
//
// =====================================================

exports.verifyOTP = async (
    req,
    res
) => {
    try {

        const {
            email,
            otp,
            otpPurpose
        } = req.body;


        // =================================================
        // VALIDATION
        // =================================================

        if (
            !email ||
            !otp ||
            !otpPurpose
        ) {
            return res.status(400).json({
                message:
                    "Email, OTP and otpPurpose are required."
            });
        }


        const allowedPurposes = [
            "emailVerification",
            "forgotPassword"
        ];


        if (
            !allowedPurposes.includes(
                otpPurpose
            )
        ) {
            return res.status(400).json({
                message:
                    "Invalid otpPurpose. Allowed values: emailVerification, forgotPassword."
            });
        }


        const normalizedEmail =
            normalizeEmail(
                email
            );


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


        // =================================================
        // EMAIL VERIFICATION
        // =================================================

        if (
            otpPurpose ===
            "emailVerification"
        ) {

            if (user.isActive) {
                return res.status(400).json({
                    message:
                        "Account is already verified."
                });
            }


            if (
                !user.otp ||
                !user.otpExpiry
            ) {
                return res.status(400).json({
                    message:
                        "No active verification OTP found."
                });
            }


            if (
                new Date() >
                user.otpExpiry
            ) {
                return res.status(400).json({
                    message:
                        "OTP has expired. Please request a new OTP."
                });
            }


            // DIRECT OTP COMPARISON
            if (
                String(user.otp) !==
                String(otp)
            ) {
                return res.status(400).json({
                    message:
                        "Invalid OTP."
                });
            }


            // =================================================
            // ACTIVATE ACCOUNT
            // =================================================

            user.isActive =
                true;

            user.emailVerifiedAt =
                new Date();

            user.otp =
                null;

            user.otpExpiry =
                null;


            await user.save();


            // =================================================
            // ACTIVE ROLES
            // =================================================

            const roles =
                await getActiveRoleNames(
                    user.id
                );


            // =================================================
            // AUTO LOGIN
            // =================================================

            const token =
                await createAccessToken(
                    user
                );


            return res.status(200).json({
                message:
                    "Email verified successfully. Login successful.",

                token,

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
        // FORGOT PASSWORD OTP
        // =================================================

        if (
            otpPurpose ===
            "forgotPassword"
        ) {

            if (!user.isActive) {
                return res.status(403).json({
                    message:
                        "Account is inactive. Please verify your email first."
                });
            }


            if (
                !user.otp ||
                !user.otpExpiry
            ) {
                return res.status(400).json({
                    message:
                        "No active password reset OTP found."
                });
            }


            if (
                new Date() >
                user.otpExpiry
            ) {
                return res.status(400).json({
                    message:
                        "OTP has expired."
                });
            }


            // DIRECT OTP COMPARISON
            if (
                String(user.otp) !==
                String(otp)
            ) {
                return res.status(400).json({
                    message:
                        "Invalid OTP."
                });
            }


            // OTP cannot be reused.
            user.otp =
                null;

            user.otpExpiry =
                null;


            await user.save();


            // =================================================
            // CREATE PASSWORD RESET TOKEN
            // =================================================

            const resetToken =
                jwt.sign(
                    {
                        id:
                            user.id,

                        purpose:
                            "password-reset",

                        version:
                            user.passwordResetVersion
                    },

                    process.env.JWT_SECRET,

                    {
                        expiresIn:
                            process.env.RESET_TOKEN_EXPIRES_IN ||
                            "10m"
                    }
                );


            return res.status(200).json({
                message:
                    "OTP verified successfully. You may now reset your password.",

                resetToken
            });
        }

    } catch (error) {

        console.error(
            "Verify OTP error:",
            error
        );

        return res.status(500).json({
            message:
                "Internal server error."
        });
    }
};


// =====================================================
// RESEND USER REGISTRATION OTP
// =====================================================

exports.resendVerificationOTP =
    async (
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
                normalizeEmail(
                    email
                );


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


            if (user.isActive) {
                return res.status(400).json({
                    message:
                        "Account is already verified."
                });
            }


            const otp =
                generateOTP();

            const otpExpiry =
                getOTPExpiry();


            user.otp =
                otp;

            user.otpExpiry =
                otpExpiry;


            await user.save();


            await sendOTP(
                normalizedEmail,
                otp,
                "Your New Verification OTP"
            );


            return res.status(200).json({
                message:
                    "A new verification OTP has been sent."
            });

        } catch (error) {

            console.error(
                "Resend OTP error:",
                error
            );

            return res.status(500).json({
                message:
                    "Internal server error."
            });
        }
    };


// =====================================================
// USER LOGIN
// =====================================================
//
// POST /api/user/login
//
// Requires:
//
// USER role
// suspended = false
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


        if (!user.isActive) {
            return res.status(403).json({
                message:
                    "Please verify your email before logging in."
            });
        }


        // =================================================
        // USER ROLE FROM user_roles
        // =================================================

        const userRole =
            await getRoleByName(
                "user"
            );


        if (!userRole) {
            return res.status(500).json({
                message:
                    "User role is not configured."
            });
        }


        const userAssignment =
            await UserRole.findOne({
                where: {
                    userId:
                        user.id,

                    roleId:
                        userRole.id,

                    suspended:
                        false
                }
            });


        if (!userAssignment) {
            return res.status(403).json({
                message:
                    "Active user role is required."
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
        // ACTIVE ROLES
        // =================================================

        const roles =
            await getActiveRoleNames(
                user.id
            );


        // =================================================
        // JWT
        // =================================================

        const token =
            await createAccessToken(
                user
            );


        return res.status(200).json({
            message:
                "Login successful.",

            token,

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
            "User login error:",
            error
        );

        return res.status(500).json({
            message:
                "Internal server error."
        });
    }
};


// =====================================================
// SUPERADMIN LOGIN
// =====================================================
//
// POST /api/admin/login
//
// Requires:
//
// SUPERADMIN role
// suspended = false
//
// The superadmin does NOT need the USER role simply
// to authenticate.
//
// =====================================================

exports.adminLogin = async (
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
                    "Account is inactive."
            });
        }


        // =================================================
        // FIND SUPERADMIN ROLE
        // =================================================

        const superadminRole =
            await getRoleByName(
                "superadmin"
            );


        if (!superadminRole) {
            return res.status(500).json({
                message:
                    "Superadmin role is not configured."
            });
        }


        // =================================================
        // CHECK SUPERADMIN ASSIGNMENT
        // =================================================
        //
        // MANDATORY user_roles CHECK
        //
        // =================================================

        const superadminAssignment =
            await UserRole.findOne({
                where: {
                    userId:
                        user.id,

                    roleId:
                        superadminRole.id,

                    suspended:
                        false
                }
            });


        if (!superadminAssignment) {
            return res.status(403).json({
                message:
                    "Active superadmin role is required."
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
        // GET ALL ACTIVE ROLES
        // =================================================
        //
        // This preserves the multi-role JWT model.
        //
        // Example:
        //
        // {
        //     id: 1,
        //     roles: ["superadmin"]
        // }
        //
        // =================================================

        const roles =
            await getActiveRoleNames(
                user.id
            );


        // =================================================
        // CREATE JWT
        // =================================================

        const token =
            await createAccessToken(
                user
            );


        // =================================================
        // RESPONSE
        // =================================================

        return res.status(200).json({
            message:
                "Superadmin login successful.",

            token,

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
            "Superadmin login error:",
            error
        );

        return res.status(500).json({
            message:
                "Internal server error."
        });
    }
};


// =====================================================
// USER FORGOT PASSWORD
// =====================================================
//
// POST /api/user/forgot-password
//
// Requires active USER role.
//
// =====================================================

exports.forgotPassword =
    async (
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
                normalizeEmail(
                    email
                );


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
            // USER ROLE
            // =================================================

            const userRole =
                await getRoleByName(
                    "user"
                );


            if (!userRole) {
                return res.status(500).json({
                    message:
                        "User role is not configured."
                });
            }


            const userAssignment =
                await UserRole.findOne({
                    where: {
                        userId:
                            user.id,

                        roleId:
                            userRole.id,

                        suspended:
                            false
                    }
                });


            if (!userAssignment) {
                return res.status(403).json({
                    message:
                        "Active user role is required."
                });
            }


            // =================================================
            // GENERATE OTP
            // =================================================

            const otp =
                generateOTP();

            const otpExpiry =
                getOTPExpiry();


            user.otp =
                otp;

            user.otpExpiry =
                otpExpiry;


            await user.save();


            await sendOTP(
                normalizedEmail,
                otp,
                "Password Reset OTP"
            );


            return res.status(200).json({
                message:
                    "Password reset OTP has been sent to your email."
            });

        } catch (error) {

            console.error(
                "User forgot password error:",
                error
            );

            return res.status(500).json({
                message:
                    "Internal server error."
            });
        }
    };


// =====================================================
// VENDOR LOGIN
// =====================================================
//
// POST /api/vendor/login
//
// Requires:
//
// VENDOR role
// suspended = false
// correct password
//
// Then checks:
//
// vendor_details.hasAddress
//
// =====================================================

exports.vendorLogin = async (
    req,
    res
) => {
    try {

        const {
            email,
            password
        } = req.body;


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
        // VENDOR ROLE
        // =================================================

        const vendorRole =
            await getRoleByName(
                "vendor"
            );


        if (!vendorRole) {
            return res.status(500).json({
                message:
                    "Vendor role is not configured."
            });
        }


        // =================================================
        // VENDOR ASSIGNMENT
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


        if (!vendorAssignment) {
            return res.status(403).json({
                message:
                    "Vendor role is required."
            });
        }


        // =================================================
        // SUSPENSION
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
        // ACTIVE ROLES
        // =================================================

        const roles =
            await getActiveRoleNames(
                user.id
            );


        // =================================================
        // JWT
        // =================================================

        const token =
            await createAccessToken(
                user
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
        // ADDRESS MISSING
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
// VENDOR FORGOT PASSWORD
// =====================================================
//
// POST /api/vendor/forgot-password
//
// Same OTP system:
//
// users.otp
// users.otpExpiry
//
// Verification:
//
// POST /api/auth/verify-otp
//
// otpPurpose = forgotPassword
//
// =====================================================

exports.vendorForgotPassword =
    async (
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
                normalizeEmail(
                    email
                );


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
            // FIND VENDOR ROLE
            // =================================================

            const vendorRole =
                await getRoleByName(
                    "vendor"
                );


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
            // GENERATE OTP
            // =================================================

            const otp =
                generateOTP();

            const otpExpiry =
                getOTPExpiry();


            user.otp =
                otp;

            user.otpExpiry =
                otpExpiry;


            await user.save();


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


// =====================================================
// RESET PASSWORD
// =====================================================
//
// Shared by USER and VENDOR.
//
// OTP verification creates resetToken.
// New password is bcrypt hashed.
//
// =====================================================

exports.resetPassword =
    async (
        req,
        res
    ) => {
        try {

            const {
                resetToken,
                newPassword
            } = req.body;


            if (
                !resetToken ||
                !newPassword
            ) {
                return res.status(400).json({
                    message:
                        "Reset token and new password are required."
                });
            }


            if (
                !validatePassword(
                    newPassword
                )
            ) {
                return res.status(400).json({
                    message:
                        "Password must contain at least 8 characters."
                });
            }


            // =================================================
            // VERIFY RESET TOKEN
            // =================================================

            let decoded;

            try {

                decoded =
                    jwt.verify(
                        resetToken,
                        process.env.JWT_SECRET
                    );

            } catch (error) {

                return res.status(401).json({
                    message:
                        "Invalid or expired password reset token."
                });
            }


            if (
                decoded.purpose !==
                "password-reset"
            ) {
                return res.status(401).json({
                    message:
                        "Invalid password reset token."
                });
            }


            // =================================================
            // FIND USER
            // =================================================

            const user =
                await User.findByPk(
                    decoded.id
                );


            if (!user) {
                return res.status(404).json({
                    message:
                        "User not found."
                });
            }


            // =================================================
            // RESET TOKEN VERSION
            // =================================================

            if (
                decoded.version !==
                user.passwordResetVersion
            ) {
                return res.status(401).json({
                    message:
                        "Password reset token is no longer valid."
                });
            }


            // =================================================
            // HASH NEW PASSWORD
            // =================================================

            user.password =
                await bcrypt.hash(
                    newPassword,
                    12
                );


            user.passwordResetVersion +=
                1;


            await user.save();


            return res.status(200).json({
                message:
                    "Password reset successfully. You can now login."
            });

        } catch (error) {

            console.error(
                "Reset password error:",
                error
            );

            return res.status(500).json({
                message:
                    "Internal server error."
            });
        }
    };