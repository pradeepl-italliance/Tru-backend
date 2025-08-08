const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const ownerRoutes = require('./routes/ownerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const bookingRoutes = require('./routes/bookingRoutes')

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Enhanced Request Logging Middleware
app.use((req, res, next) => {
  const now = new Date().toISOString();
  const startTime = Date.now();
  
  // Log the incoming request
  console.log(`\n📥 [${now}] ${req.method} ${req.originalUrl}`);
  
  // Capture the response when it finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusEmoji = res.statusCode >= 400 ? '❌' : res.statusCode >= 300 ? '⚠️' : '✅';
    
    console.log(`📤 ${statusEmoji} Status: ${res.statusCode} | Duration: ${duration}ms | ${req.method} ${req.originalUrl}`);
  });
  
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/booking', bookingRoutes)

// Enhanced Error handling middleware
app.use((err, req, res, next) => {
  const now = new Date().toISOString();
  console.error(`\n❌ [${now}] ERROR in ${req.method} ${req.originalUrl}`);
  console.error(`   Error: ${err.message}`);
  console.error(`   Stack: ${err.stack}`);
  console.error(`${'='.repeat(60)}\n`);
  
  res.status(500).json({ 
    error: 'Something broke!', 
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error' 
  });
});

// 404 handler
app.use('*', (req, res) => {
  const now = new Date().toISOString();
  console.log(`\n❓ [${now}] 404 - Route not found: ${req.method} ${req.originalUrl}`);
  console.log(`${'='.repeat(60)}\n`);
  res.status(404).json({ error: 'Route not found' });
});

module.exports = app;