const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiting middleware
// General API limit: 100 requests per minute
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limit for auth routes (login/register): 10 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Initialize database connection
const { initializeDatabase } = require('./database/db');

// Middleware
const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || 'http://localhost:3000,http://localhost:5173').split(',').map(o => o.trim().replace(/\/$/, ''));

// In development, allow localhost origins. In production, only allow specified origins
const isProduction = process.env.NODE_ENV === 'production';
const corsOptions = {
  origin: (origin, callback) => {
    const requestOrigin = (origin || '').replace(/\/$/, '');

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    // In development, allow localhost origins for convenience
    if (!isProduction && (requestOrigin.includes('localhost') || requestOrigin.includes('127.0.0.1'))) {
      return callback(null, true);
    }

    // Check against allowed origins
    if (allowedOrigins.includes('*') || allowedOrigins.includes(requestOrigin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked: ${requestOrigin} not in allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error(`CORS policy violation: Origin ${requestOrigin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply general rate limit to all API routes
app.use('/api', generalLimiter);

// Health check - respond immediately (doesn't require database)
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Routes
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/incidents', require('./routes/incidents'));
app.use('/api/student-records', require('./routes/studentRecords'));
app.use('/api/users', require('./routes/users'));
app.use('/api/violations', require('./routes/violations'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/sanctions', require('./routes/sanctions'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Initialize database in background
initializeDatabase().catch(err => {
  console.error('Database initialization failed:', err.message);
});

module.exports = app;