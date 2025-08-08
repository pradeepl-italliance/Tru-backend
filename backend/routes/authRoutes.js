const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Register new user
router.post('/register', authController.register);

// Login with password
router.post('/login/password', authController.loginWithPassword);

// Login with OTP
router.post('/login/otp', authController.loginWithOTP);

// Send OTP
router.post('/send-otp', authController.sendOTP);

// Validate OTP
router.post('/validate-otp', authController.validateOTP);

module.exports = router;