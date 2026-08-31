const express = require('express');

const router = express.Router();

const adminController = require('../controller/adminController');
const authenticate = require('../middleware/authMiddleware');
const { authorizeSuperadmin } = require('../middleware/roleMiddleware');

// SUPERADMIN LOGIN
router.post('/login', adminController.login);

// SUPERADMIN ME
router.get('/me', authenticate, authorizeSuperadmin, adminController.getMe);

// PROMOTE USER TO VENDOR
router.post(
  '/users/:userId/vendor',
  authenticate,
  authorizeSuperadmin,
  adminController.appointVendor
);

// SUSPEND VENDOR
router.patch(
  '/users/:userId/vendor/suspend',
  authenticate,
  authorizeSuperadmin,
  adminController.suspendVendor
);

// ACTIVATE VENDOR
router.patch(
  '/users/:userId/vendor/activate',
  authenticate,
  authorizeSuperadmin,
  adminController.activateVendor
);

module.exports = router;
