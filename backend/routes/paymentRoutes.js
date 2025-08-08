const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const paymentController = require('../controllers/paymentController');

router.use(auth);

// Mock payment route
router.post('/process', paymentController.processPayment);

module.exports = router;