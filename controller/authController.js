const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const {
    User,
    Role,
    UserRole,
    sequelize
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
            process.env.OTP_EXPIRY_MINUTES ||
            10
        );

    return new Date(
        Date.now() +
        minutes * 60 * 1000
    );
};


const normalizeEmail = (
    email
) => {
    return email
        .trim()
        .toLowerCase();
};


const validatePassword = (
    password
) => {
    return (
        typeof password ===
        "string" &&
        password.length >= 8
    );
};


// =====================================================
// REGISTER
// =====================================================

exports.register = async (
    req,
    res
) => {
    const transaction =
        await sequelize.transaction();

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
            await transaction.rollback();

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
            await transaction.rollback();

            return res.status(400).json({
                message:
                    "Password must contain at least 8 characters."
            });
        }


        const normalizedEmail =
            normalizeEmail(email);

        const normalizedFirstName =
            firstName.trim();

        const normalizedLastName =
            lastName.trim();


        // =================================================
        // CHECK EXISTING USER
        // =================================================

        const existingUser =
            await User.findOne({
                where: {
                    email:
                        normalizedEmail
                },

                transaction
            });


        if (existingUser) {
            await transaction.rollback();

            return res.status(409).json({
                message:
                    "An account with this email already exists."
            });
        }


        // =================================================
        // FIND USER ROLE
        // =================================================

        const userRole =
            await Role.findOne({
                where: {
                    name: "user"
                },

                transaction
            });


        if (!userRole) {
            await transaction.rollback();

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
            await User.create(
                {
                    firstName:
                        normalizedFirstName,

                    lastName:
                        normalizedLastName,

                    email:
                        normalizedEmail,

                    password:
                        hashedPassword,

                    isActive: false,

                    otp:
                        otp,

                    otpExpiry:
                        otpExpiry
                },
                {
                    transaction
                }
            );


        // =================================================
        // CREATE USER ROLE
        // =================================================

        await UserRole.create(
            {
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
            },
            {
                transaction
            }
        );


        // =================================================
        // COMMIT
        // =================================================

        await transaction.commit();


        // =================================================
        // SEND OTP
        // =================================================

        try {
            await sendOTP(
                normalizedEmail,
                otp,
                "Verify Your Account"
            );

        } catch (emailError) {

            console.error(
                "Registration email error:",
                emailError
            );

            // IMPORTANT:
            //
            // User remains in DB.
            //
            // They can request another OTP.

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

        if (
            !transaction.finished
        ) {
            await transaction.rollback();
        }

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
// otpPurpose:
//
// "emailVerification"
// "forgotPassword"
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


            // DIRECT COMPARISON
            if (
                user.otp !== otp
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
                    assignment =>
                        assignment.role.name
                );


            // =================================================
            // AUTO LOGIN AFTER EMAIL VERIFICATION
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
        // FORGOT PASSWORD
        // =================================================

        if (
            otpPurpose ===
            "forgotPassword"
        ) {

            if (!user.isActive) {
                return res.status(403).json({
                    message:
                        "Please verify your email before resetting your password."
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


            // DIRECT COMPARISON
            if (
                user.otp !== otp
            ) {
                return res.status(400).json({
                    message:
                        "Invalid OTP."
                });
            }


            user.otp =
                null;

            user.otpExpiry =
                null;


            await user.save();


            // =================================================
            // CREATE RESET TOKEN
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
// RESEND REGISTRATION OTP
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
// LOGIN
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
        // LOAD ALL ASSIGNED ROLES
        // =================================================
        //
        // IMPORTANT:
        // The JWT contains role names.
        //
        // Vendor suspension is checked separately
        // against user_roles by authorizeVendor().
        //

        const roleAssignments =
            await UserRole.findAll({
                where: {
                    userId:
                        user.id
                },

                include: [
                    {
                        model:
                            Role,

                        as:
                            "role",

                        attributes: [
                            "id",
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
            "Login error:",
            error
        );

        return res.status(500).json({
            message:
                "Internal server error."
        });
    }
};


// =====================================================
// FORGOT PASSWORD
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
                        "Please verify your email before resetting your password."
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
                "Password Reset OTP"
            );


            return res.status(200).json({
                message:
                    "Password reset OTP has been sent to your email."
            });

        } catch (error) {

            console.error(
                "Forgot password error:",
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


            if (
                decoded.version !==
                user.passwordResetVersion
            ) {
                return res.status(401).json({
                    message:
                        "Password reset token is no longer valid."
                });
            }


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