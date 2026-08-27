const express = require("express");

const router = express.Router();

const authController =
    require("../controller/authController");

const rbacController =
    require("../controller/rbacController");

const authenticate =
    require("../middleware/authMiddleware");

const {
    authorizeUser,
    authorizeSuperadmin,
    authorizeVendor
} = require("../middleware/roleMiddleware");


// =====================================================
// AUTH
// =====================================================

// Public registration
router.post(
    "/auth/register",
    authController.register
);


// One OTP route
router.post(
    "/auth/verify-otp",
    authController.verifyOTP
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


// Reset password
router.post(
    "/auth/reset-password",
    authController.resetPassword
);


// =====================================================
// USER ROUTES
// =====================================================
//
// User role is required.
//
// A vendor who also has USER role can access these
// routes because one person can have multiple roles.
//

router.get(
    "/user/profile",
    authenticate,
    authorizeUser,
    (req, res) => {
        return res.status(200).json({
            message:
                "User route accessed successfully.",

            user: {
                id:
                    req.user.id,

                email:
                    req.user.email,

                roles:
                    req.user.roles
            }
        });
    }
);


// =====================================================
// VENDOR ROUTES
// =====================================================
//
// Requires:
// vendor role
// AND
// suspended = false
//

router.get(
    "/vendor/profile",
    authenticate,
    authorizeVendor,
    (req, res) => {
        return res.status(200).json({
            message:
                "Vendor route accessed successfully.",

            user: {
                id:
                    req.user.id,

                email:
                    req.user.email,

                roles:
                    req.user.roles
            }
        });
    }
);


// =====================================================
// ADMIN ROUTES
// =====================================================
//
// Requires active superadmin role.
//

// Appoint existing user as vendor
router.post(
    "/admin/users/:userId/vendor",
    authenticate,
    authorizeSuperadmin,
    rbacController.appointVendor
);


// Suspend vendor
router.patch(
    "/admin/users/:userId/vendor/suspend",
    authenticate,
    authorizeSuperadmin,
    rbacController.suspendVendor
);


// Activate vendor
router.patch(
    "/admin/users/:userId/vendor/activate",
    authenticate,
    authorizeSuperadmin,
    rbacController.activateVendor
);


module.exports = router;