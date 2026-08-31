const express = require('express');

const router = express.Router();

// ROUTE MODULES

const userRoutes = require('./userRoutes');

const vendorRoutes = require('./vendorRoutes');

const adminRoutes = require('./adminRoutes');

router.use('/user', userRoutes);

router.use('/vendor', vendorRoutes);

router.use('/admin', adminRoutes);

module.exports = router;
