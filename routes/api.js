const express = require("express");

const router = express.Router();

const authController = require("../controller/authController");
const rbacController = require("../controller/rbacController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");


// =====================================================
// AUTH ROUTES
// =====================================================

// Registration
router.post(
    "/auth/register",
    authController.register
);

// Verify registration OTP
router.post(
    "/auth/verify-email",
    authController.verifyRegistration
);

// Resend registration OTP
router.post(
    "/auth/resend-verification",
    authController.resendVerificationOTP
);

// Login
router.post(
    "/auth/login",
    authController.login
);

// Forgot password
router.post(
    "/auth/forgot-password",
    authController.forgotPassword
);

// Verify password reset OTP
router.post(
    "/auth/verify-reset-otp",
    authController.verifyResetOTP
);

// Reset password
router.post(
    "/auth/reset-password",
    authController.resetPassword
);


// =====================================================
// RBAC ROUTES
// =====================================================

// Only superadmin can change user roles
router.patch(
    "/rbac/users/:userId/role",

    authenticate,

    authorizeRoles("superadmin"),

    rbacController.changeUserRole
);


module.exports = router;