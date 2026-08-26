const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { User, Role } = require("../models");

const { sendOTP } = require("../services/emailService");


// =====================================================
// HELPERS
// =====================================================

const generateOTP = () => {
    return crypto.randomInt(100000, 1000000).toString();
};

const hashOTP = (otp) => {
    return crypto
        .createHash("sha256")
        .update(otp)
        .digest("hex");
};

const getOTPExpiry = () => {
    const minutes = Number(process.env.OTP_EXPIRY_MINUTES || 10);

    return new Date(Date.now() + minutes * 60 * 1000);
};

const normalizeEmail = (email) => {
    return email.trim().toLowerCase();
};

const validatePassword = (password) => {
    return typeof password === "string" && password.length >= 8;
};


// =====================================================
// REGISTER
// =====================================================

exports.register = async (req, res) => {
    try {
        
        const {firstName,lastName,email,password} = req.body;

        if (!firstName || !lastName || !email || !password) 
        {
            return res.status(400).json({
                message:
                    "First name, last name, email and password are required."
            });
        }

        if (!validatePassword(password)) {
            return res.status(400).json({
                message: "Password must contain at least 8 characters."
            });
        }
        const normalizedFirstName = firstName.trim();
        const normalizedLastName = lastName.trim();
        const normalizedEmail = normalizeEmail(email);

        const existingUser = await User.findOne({
            where: {
                email: normalizedEmail
            }
        });

        if (existingUser) {
            return res.status(409).json({
                message: "An account with this email already exists."
            });
        }

        // ALWAYS assign public registrations to "user"
        const userRole = await Role.findOne({
            where: {
                name: "user"
            }
        });

        if (!userRole) {
            return res.status(500).json({
                message: "Default user role is not configured."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const otp = generateOTP();

        const user = await User.create({
            firstName: normalizedFirstName,
            lastName: normalizedLastName,

            email: normalizedEmail,

            password: hashedPassword,

            roleId: userRole.id,

            // Important:
            // Every new registration starts inactive.
            isActive: false,

            emailVerificationOtpHash: hashOTP(otp),

            emailVerificationOtpExpiry: getOTPExpiry()
        });

        try {
            await sendOTP(
                normalizedEmail,
                otp,
                "Verify Your Account"
            );
        } catch (emailError) {
            await user.destroy();

            console.error("Registration email error:", emailError);

            return res.status(500).json({
                message: "Unable to send verification email."
            });
        }

        return res.status(201).json({
            message:
                "Registration successful. Please verify your email using the OTP sent to your email."
        });

    } catch (error) {
        console.error("Register error:", error);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};


// =====================================================
// VERIFY REGISTRATION OTP
// =====================================================

exports.verifyRegistration = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                message: "Email and OTP are required."
            });
        }

        const normalizedEmail = normalizeEmail(email);

        const user = await User.findOne({
            where: {
                email: normalizedEmail
            }
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        if (user.isActive) {
            return res.status(400).json({
                message: "Account is already verified."
            });
        }

        if (
            !user.emailVerificationOtpHash ||
            !user.emailVerificationOtpExpiry
        ) {
            return res.status(400).json({
                message: "No active verification OTP found."
            });
        }

        if (new Date() > user.emailVerificationOtpExpiry) {
            return res.status(400).json({
                message: "OTP has expired. Please request a new OTP."
            });
        }

        const otpHash = hashOTP(otp);

        if (otpHash !== user.emailVerificationOtpHash) {
            return res.status(400).json({
                message: "Invalid OTP."
            });
        }

        user.isActive = true;

        user.emailVerifiedAt = new Date();

        // OTP can no longer be reused
        user.emailVerificationOtpHash = null;
        user.emailVerificationOtpExpiry = null;

        await user.save();

        return res.status(200).json({
            message:
                "Email verified successfully. You can now login."
        });

    } catch (error) {
        console.error("Verify registration error:", error);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};


// =====================================================
// RESEND REGISTRATION OTP
// =====================================================

exports.resendVerificationOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email is required."
            });
        }

        const normalizedEmail = normalizeEmail(email);

        const user = await User.findOne({
            where: {
                email: normalizedEmail
            }
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        if (user.isActive) {
            return res.status(400).json({
                message: "Account is already verified."
            });
        }

        const otp = generateOTP();

        user.emailVerificationOtpHash = hashOTP(otp);
        user.emailVerificationOtpExpiry = getOTPExpiry();

        await user.save();

        await sendOTP(
            normalizedEmail,
            otp,
            "Your New Verification OTP"
        );

        return res.status(200).json({
            message: "A new verification OTP has been sent."
        });

    } catch (error) {
        console.error("Resend OTP error:", error);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};


// =====================================================
// LOGIN
// =====================================================

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required."
            });
        }

        const normalizedEmail = normalizeEmail(email);

        const user = await User.findOne({
            where: {
                email: normalizedEmail
            },

            include: [
                {
                    model: Role,
                    as: "role",
                    attributes: ["id", "name"]
                }
            ]
        });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                message:
                    "Please verify your email before logging in."
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                roleId: user.roleId,
                role: user.role.name
            },

            process.env.JWT_SECRET,

            {
                expiresIn:
                    process.env.JWT_EXPIRES_IN || "1d"
            }
        );

        return res.status(200).json({
            message: "Login successful.",

            token,

            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role.name
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};


// =====================================================
// FORGOT PASSWORD
// =====================================================

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email is required."
            });
        }

        const normalizedEmail = normalizeEmail(email);

        const user = await User.findOne({
            where: {
                email: normalizedEmail
            }
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                message:
                    "Please verify your email before resetting your password."
            });
        }

        const otp = generateOTP();

        user.passwordResetOtpHash = hashOTP(otp);

        user.passwordResetOtpExpiry = getOTPExpiry();

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
        console.error("Forgot password error:", error);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};


// =====================================================
// VERIFY PASSWORD RESET OTP
// =====================================================

exports.verifyResetOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                message: "Email and OTP are required."
            });
        }

        const normalizedEmail = normalizeEmail(email);

        const user = await User.findOne({
            where: {
                email: normalizedEmail
            }
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        if (
            !user.passwordResetOtpHash ||
            !user.passwordResetOtpExpiry
        ) {
            return res.status(400).json({
                message: "No active password reset OTP found."
            });
        }

        if (new Date() > user.passwordResetOtpExpiry) {
            return res.status(400).json({
                message: "OTP has expired."
            });
        }

        const otpHash = hashOTP(otp);

        if (otpHash !== user.passwordResetOtpHash) {
            return res.status(400).json({
                message: "Invalid OTP."
            });
        }

        // OTP becomes unusable after verification
        user.passwordResetOtpHash = null;
        user.passwordResetOtpExpiry = null;

        await user.save();

        const resetToken = jwt.sign(
            {
                id: user.id,
                purpose: "password-reset",
                version: user.passwordResetVersion
            },

            process.env.JWT_SECRET,

            {
                expiresIn:
                    process.env.RESET_TOKEN_EXPIRES_IN || "10m"
            }
        );

        return res.status(200).json({
            message:
                "OTP verified successfully. You may now reset your password.",

            resetToken
        });

    } catch (error) {
        console.error("Verify reset OTP error:", error);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};


// =====================================================
// RESET PASSWORD
// =====================================================

exports.resetPassword = async (req, res) => {
    try {
        const {
            resetToken,
            newPassword
        } = req.body;

        if (!resetToken || !newPassword) {
            return res.status(400).json({
                message:
                    "Reset token and new password are required."
            });
        }

        if (!validatePassword(newPassword)) {
            return res.status(400).json({
                message:
                    "Password must contain at least 8 characters."
            });
        }

        let decoded;

        try {
            decoded = jwt.verify(
                resetToken,
                process.env.JWT_SECRET
            );
        } catch (error) {
            return res.status(401).json({
                message:
                    "Invalid or expired password reset token."
            });
        }

        if (decoded.purpose !== "password-reset") {
            return res.status(401).json({
                message: "Invalid password reset token."
            });
        }

        const user = await User.findByPk(decoded.id);

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        // Prevent reuse of old reset tokens
        if (
            decoded.version !==
            user.passwordResetVersion
        ) {
            return res.status(401).json({
                message:
                    "Password reset token is no longer valid."
            });
        }

        user.password = await bcrypt.hash(
            newPassword,
            12
        );

        user.passwordResetVersion += 1;

        await user.save();

        return res.status(200).json({
            message:
                "Password reset successfully. You can now login."
        });

    } catch (error) {
        console.error("Reset password error:", error);

        return res.status(500).json({
            message: "Internal server error."
        });
    }
};