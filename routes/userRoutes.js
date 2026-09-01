const express = require('express');

const router = express.Router();

// CONTROLLERS

const authController = require('../controller/authController');

const userController = require('../controller/userController');

// MIDDLEWARE

const authenticate = require('../middleware/authMiddleware');

const { authorizeUser } = require('../middleware/roleMiddleware');

// AUTHENTICATION ROUTES

router.post('/auth/register', authController.register);

router.post('/auth/send-otp', authController.sendOTP);

router.post('/auth/verify-email', authController.verifyEmail);

router.post('/auth/resend-otp', authController.resendOTP);

// USER LOGIN

router.post('/login', userController.login);

// USER / ME

router.get('/me', authenticate, authorizeUser, userController.getMe);

// USER PROFILE

router.get('/profile', authenticate, authorizeUser, userController.getProfile);

// UPDATE USER PROFILE

router.patch('/profile', authenticate, authorizeUser, userController.updateProfile);

// USER CHANGE PASSWORD

router.patch('/change-password', authenticate, authorizeUser, userController.changePassword);

// STORE LISTING

router.get('/stores', authenticate, authorizeUser, userController.getStores);

// SINGLE STORE

router.get('/stores/:vendorId', authenticate, authorizeUser, userController.getStoreById);

// LOYALTY PROGRAM DETAILS

router.get(
  '/stores/:vendorId/loyalty-programs/:programId',
  authenticate,
  authorizeUser,
  userController.getLoyaltyProgramDetails
);

// ENROLL IN LOYALTY PROGRAM

router.post('/loyalty-programs/:programId/enroll', authenticate, authorizeUser, userController.enrollLoyaltyProgram);

// SCAN LOYALTY PROGRAM QR CODE
// Uses the authenticated current user from the same JWT identity used by /me.
// GET /me remains read-only.

router.post('/me/loyalty-programs/scan', authenticate, authorizeUser, userController.scanLoyaltyQr);

// VERIFY VENDOR-GENERATED PIN AFTER A PIN-PROTECTED QR SCAN

router.post('/me/loyalty-programs/verify-pin', authenticate, authorizeUser, userController.verifyLoyaltyPin);

module.exports = router;
