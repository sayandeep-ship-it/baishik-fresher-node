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

const userController =
    require("../controller/userController");


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

const uploadLoyaltyImage =
    require("../middleware/loyaltyUploadMiddleware");


// =====================================================
// AUTH ROUTES
// =====================================================


// -----------------------------------------------------
// USER REGISTRATION
// -----------------------------------------------------

router.post(
    "/auth/register",
    authController.register
);


// -----------------------------------------------------
// UNIFIED OTP VERIFICATION
// -----------------------------------------------------
//
// otpPurpose:
//
// emailVerification
// forgotPassword
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
// SHARED PASSWORD RESET
// -----------------------------------------------------
//
// Used for the forgot-password flow.
//
// -----------------------------------------------------

router.post(
    "/auth/reset-password",
    authController.resetPassword
);

// =====================================================
// CURRENT LOGGED-IN USER (ME-API)
// =====================================================
router.get(
    "/me",
    authenticate,
    authController.me
);

// =====================================================
// USER ROUTES
// =====================================================


// -----------------------------------------------------
// USER LOGIN
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
    userController.getProfile
);


// -----------------------------------------------------
// USER PROFILE UPDATE
// -----------------------------------------------------

router.patch(
    "/user/profile",
    authenticate,
    authorizeUser,
    userController.updateProfile
);


// -----------------------------------------------------
// USER CHANGE PASSWORD
// -----------------------------------------------------
//
// Logged-in user.
// No OTP.
//
// -----------------------------------------------------

router.patch(
    "/user/change-password",
    authenticate,
    authorizeUser,
    userController.changePassword
);


// -----------------------------------------------------
// STORE LISTING
// -----------------------------------------------------

router.get(
    "/user/stores",
    authenticate,
    authorizeUser,
    userController.getStores
);


// -----------------------------------------------------
// STORE + LOYALTY PROGRAMS
// -----------------------------------------------------

router.get(
    "/user/stores/:vendorId",
    authenticate,
    authorizeUser,
    userController.getStoreById
);


// -----------------------------------------------------
// LOYALTY PROGRAM DETAILS
// -----------------------------------------------------

router.get(
    "/user/stores/:vendorId/loyalty-programs/:programId",
    authenticate,
    authorizeUser,
    userController.getLoyaltyProgramDetails
);


// =====================================================
// VENDOR ROUTES
// =====================================================


// -----------------------------------------------------
// VENDOR LOGIN
// -----------------------------------------------------
//
// IMPORTANT:
// Vendor login belongs to vendorController.
//
// -----------------------------------------------------

router.post(
    "/vendor/login",
    vendorController.login
);


// -----------------------------------------------------
// VENDOR CHANGE PASSWORD
// -----------------------------------------------------
//
// Vendor must already be logged in.
//
// Bearer token required.
//
// No OTP.
//
// -----------------------------------------------------

router.patch(
    "/vendor/change-password",
    authenticate,
    authorizeVendor,
    vendorController.changeVendorPassword
);


// -----------------------------------------------------
// VENDOR PROFILE
// -----------------------------------------------------

router.get(
    "/vendor/profile",
    authenticate,
    authorizeVendor,
    (req, res) => {

        return res.status(200).json({

            success:
                true,

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


// -----------------------------------------------------
// VENDOR DASHBOARD
// -----------------------------------------------------

router.get(
    "/vendor/dashboard",
    authenticate,
    authorizeVendor,
    vendorController.getDashboard
);


// =====================================================
// ADMIN / SUPERADMIN ROUTES
// =====================================================


// -----------------------------------------------------
// SUPERADMIN LOGIN
// -----------------------------------------------------

router.post(
    "/admin/login",
    authController.adminLogin
);


// -----------------------------------------------------
// APPOINT USER AS VENDOR
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

router.patch(
    "/admin/users/:userId/vendor/suspend",
    authenticate,
    authorizeSuperadmin,
    rbacController.suspendVendor
);


// -----------------------------------------------------
// ACTIVATE VENDOR
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


// -----------------------------------------------------
// CREATE LOYALTY PROGRAM
// -----------------------------------------------------

router.post(
    "/vendor/loyalty-programs",
    authenticate,
    authorizeVendor,
    uploadLoyaltyImage.single("image"),
    loyaltyController.createLoyaltyProgram
);


// -----------------------------------------------------
// GET RECENT LOYALTY PROGRAMS
// -----------------------------------------------------

router.get(
    "/vendor/loyalty-programs/recent",
    authenticate,
    authorizeVendor,
    loyaltyController.getRecentLoyaltyPrograms
);


// -----------------------------------------------------
// GET ALL LOYALTY PROGRAMS
// -----------------------------------------------------

router.get(
    "/vendor/loyalty-programs",
    authenticate,
    authorizeVendor,
    loyaltyController.getAllLoyaltyPrograms
);


module.exports = router;