const express = require("express");

const router = express.Router();


// =====================================================
// CONTROLLERS
// =====================================================

const authController =
    require("../controller/authController");

const rbacController =
    require("../controller/rbacController");

const vendorController =
    require("../controller/vendorController");
    
const loyaltyController =
    require("../controller/Loyalty_Controller");

// =====================================================
// MIDDLEWARE
// =====================================================

const authenticate =
    require("../middleware/authMiddleware");

const {
    authorizeUser,
    authorizeVendor,
    authorizeSuperadmin
} = require("../middleware/roleMiddleware");

const loyaltyController =
    require("../controller/Loyalty_Controller");

const uploadLoyaltyImage =
    require("../middleware/loyaltyUploadMiddleware");
    
// =====================================================
// AUTH ROUTES
// =====================================================

// -----------------------------------------------------
// REGISTER
// -----------------------------------------------------
//
// Public user registration.
// This creates a USER role through user_roles.
//
// -----------------------------------------------------

router.post(
    "/auth/register",
    authController.register
);


// -----------------------------------------------------
// VERIFY OTP
// -----------------------------------------------------
//
// ONE OTP verification endpoint.
//
// otpPurpose:
//     emailVerification
//     forgotPassword
//
// -----------------------------------------------------

router.post(
    "/auth/verify-otp",
    authController.verifyOTP
);


// -----------------------------------------------------
// RESEND REGISTRATION OTP
// -----------------------------------------------------

router.post(
    "/auth/resend-verification",
    authController.resendVerificationOTP
);


// -----------------------------------------------------
// RESET PASSWORD
// -----------------------------------------------------
//
// Shared by USER and VENDOR.
//
// -----------------------------------------------------

router.post(
    "/auth/reset-password",
    authController.resetPassword
);


// =====================================================
// USER ROUTES
// =====================================================


// -----------------------------------------------------
// USER LOGIN
// -----------------------------------------------------
//
// Requires an ACTIVE USER role.
// The actual check happens inside authController.login()
// using the user_roles junction table.
//
// -----------------------------------------------------

router.post(
    "/user/login",
    authController.login
);


// -----------------------------------------------------
// USER FORGOT PASSWORD
// -----------------------------------------------------

router.post(
    "/user/forgot-password",
    authController.forgotPassword
);


// -----------------------------------------------------
// USER PROFILE
// -----------------------------------------------------

router.get(
    "/user/profile",
    authenticate,
    authorizeUser,
    (req, res) => {

        return res.status(200).json({
            success: true,

            message:
                "User route accessed successfully.",

            user: {
                id:
                    req.user.id,

                firstName:
                    req.user.firstName,

                lastName:
                    req.user.lastName,

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


// -----------------------------------------------------
// VENDOR LOGIN
// -----------------------------------------------------
//
// Public endpoint.
//
// Vendor login controller verifies:
//
// 1. User exists
// 2. Account is active
// 3. Vendor role exists in user_roles
// 4. Vendor suspended = false
// 5. Password is correct
//
// It then checks vendor_details.has_address.
//
// -----------------------------------------------------

router.post(
    "/vendor/login",
    authController.vendorLogin
);


// -----------------------------------------------------
// VENDOR FORGOT PASSWORD
// -----------------------------------------------------
//
// Generates the SAME OTP used by the rest of the
// authentication system.
//
// Verification:
//
// POST /api/auth/verify-otp
//
// otpPurpose = "forgotPassword"
//
// -----------------------------------------------------

router.post(
    "/vendor/forgot-password",
    authController.vendorForgotPassword
);


// -----------------------------------------------------
// VENDOR PROFILE
// -----------------------------------------------------
//
// Requires:
//
// vendor role
// AND
// suspended = false
//
// -----------------------------------------------------

router.get(
    "/vendor/profile",
    authenticate,
    authorizeVendor,
    (req, res) => {

        return res.status(200).json({
            success: true,

            message:
                "Vendor route accessed successfully.",

            user: {
                id:
                    req.user.id,

                firstName:
                    req.user.firstName,

                lastName:
                    req.user.lastName,

                email:
                    req.user.email,

                roles:
                    req.user.roles
            }
        });
    }
);


// -----------------------------------------------------
// SAVE / UPDATE VENDOR ADDRESS
// -----------------------------------------------------
//
// Requires an ACTIVE vendor role.
//
// Address is stored in vendor_details.
//
// -----------------------------------------------------

router.post(
    "/vendor/address",
    authenticate,
    authorizeVendor,
    vendorController.saveAddress
);


// -----------------------------------------------------
// GET VENDOR ADDRESS
// -----------------------------------------------------

router.get(
    "/vendor/address",
    authenticate,
    authorizeVendor,
    vendorController.getAddress
);


// =====================================================
// ADMIN / SUPERADMIN ROUTES
// =====================================================


// -----------------------------------------------------
// APPOINT USER AS VENDOR
// -----------------------------------------------------
//
// ONLY SUPERADMIN.
//
// Creates:
//
// user_roles
//     user_id
//     role_id = vendor
//     suspended = false
//
// -----------------------------------------------------

router.post(
    "/admin/users/:userId/vendor",
    authenticate,
    authorizeSuperadmin,
    rbacController.appointVendor
);


// -----------------------------------------------------
// SUSPEND VENDOR
// -----------------------------------------------------
//
// ONLY SUPERADMIN.
//
// Important:
//
// This does NOT delete:
//
// - users row
// - user_roles row
// - vendor_details row
//
// It only changes:
//
// vendor user_roles.suspended = true
//
// -----------------------------------------------------

router.patch(
    "/admin/users/:userId/vendor/suspend",
    authenticate,
    authorizeSuperadmin,
    rbacController.suspendVendor
);


// -----------------------------------------------------
// ACTIVATE VENDOR
// -----------------------------------------------------
//
// ONLY SUPERADMIN.
//
// Changes:
//
// suspended = true
//
// to:
//
// suspended = false
//
// -----------------------------------------------------

router.patch(
    "/admin/users/:userId/vendor/activate",
    authenticate,
    authorizeSuperadmin,
    rbacController.activateVendor
);

// =====================================================
// LOYALTY PROGRAM ROUTES
// =====================================================

// Create loyalty program
router.post(
    "/vendor/loyalty-programs",
    authenticate,
    authorizeVendor,
    uploadLoyaltyImage.single("image"),
    loyaltyController.createLoyaltyProgram
);


// Get 5 most recent loyalty programs
router.get(
    "/vendor/loyalty-programs/recent",
    authenticate,
    authorizeVendor,
    loyaltyController.getRecentLoyaltyPrograms
);


// Get all loyalty programs belonging to logged-in vendor
router.get(
    "/vendor/loyalty-programs",
    authenticate,
    authorizeVendor,
    loyaltyController.getAllLoyaltyPrograms
);

module.exports = router;