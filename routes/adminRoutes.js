const express = require('express');

const router = express.Router();

// CONTROLLERS

const vendorController = require('../controller/vendorController');

// MIDDLEWARE

const authenticate = require('../middleware/authMiddleware');

const { authorizeVendor } = require('../middleware/roleMiddleware');

const uploadLoyaltyImage = require('../middleware/loyaltyUploadMiddleware');

// VENDOR LOGIN

router.post('/login', vendorController.login);

// VENDOR ME

router.get('/me', authenticate, authorizeVendor, vendorController.getMe);

// VENDOR PROFILE

router.get('/profile', authenticate, authorizeVendor, vendorController.getProfile);

// UPDATE VENDOR BASIC INFORMATION

router.patch('/profile', authenticate, authorizeVendor, vendorController.updateProfile);

// VENDOR ADDRESS

router.post('/address', authenticate, authorizeVendor, vendorController.saveAddress);

// GET VENDOR ADDRESS

router.get('/address', authenticate, authorizeVendor, vendorController.getAddress);

// VENDOR CHANGE PASSWORD

router.patch('/change-password', authenticate, authorizeVendor, vendorController.changeVendorPassword);

// VENDOR DASHBOARD

router.get('/dashboard', authenticate, authorizeVendor, vendorController.getDashboard);

// CREATE LOYALTY PROGRAM

router.post(
  '/loyalty-programs',
  authenticate,
  authorizeVendor,
  uploadLoyaltyImage.single('image'),
  vendorController.createLoyaltyProgram
);

// GET ALL OWN LOYALTY PROGRAMS

router.get('/loyalty-programs', authenticate, authorizeVendor, vendorController.getAllLoyaltyPrograms);

// GET RECENT OWN LOYALTY PROGRAMS

router.get('/loyalty-programs/recent', authenticate, authorizeVendor, vendorController.getRecentLoyaltyPrograms);

// ACTIVATE OWN LOYALTY PROGRAM

router.patch(
  '/loyalty-programs/:programId/activate',
  authenticate,
  authorizeVendor,
  vendorController.activateLoyaltyProgram
);

// DEACTIVATE OWN LOYALTY PROGRAM

router.patch(
  '/loyalty-programs/:programId/deactivate',
  authenticate,
  authorizeVendor,
  vendorController.deactivateLoyaltyProgram
);

module.exports = router;
