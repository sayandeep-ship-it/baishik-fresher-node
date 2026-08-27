const express = require("express");

const router = express.Router();

const authController = require("../controller/authController");
const rbacController = require("../controller/rbacController");

const authenticate = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");


// =====================================================
// AUTH ROUTES
// =====================================================

// =====================================================
// REGISTER
// =====================================================

router.post(
    "/auth/register",
    authController.register
);


// =====================================================
// VERIFY OTP
// =====================================================
//
// One route handles:
//
// emailVerification
// forgotPassword
//
// Body:
//
// {
//     "email": "user@example.com",
//     "otp": "123456",
//     "otpPurpose": "emailVerification"
// }
//
// =====================================================

router.post(
    "/auth/verify-otp",
    authController.verifyOTP
);


// =====================================================
// RESEND REGISTRATION OTP
// =====================================================

router.post(
    "/auth/resend-verification",
    authController.resendVerificationOTP
);


// =====================================================
// LOGIN
// =====================================================

router.post(
    "/auth/login",
    authController.login
);


// =====================================================
// FORGOT PASSWORD
// =====================================================

router.post(
    "/auth/forgot-password",
    authController.forgotPassword
);


// =====================================================
// RESET PASSWORD
// =====================================================

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