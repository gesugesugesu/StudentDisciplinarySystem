const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getRow, getAllRows, runQuery } = require('../database/db');

const router = express.Router();

// Register new user (admin/faculty)
router.post('/register', async (req, res) => {
  try {
    const { password, email, fullName, role, studentId, contactNumber, course, yearLevel } = req.body;

    if (!password || !email || !fullName || !role) {
      return res.status(400).json({
        error: 'Password, email, full name, and role are required'
      });
    }

    if (role === 'Student' && (!contactNumber || !course || !yearLevel)) {
      return res.status(400).json({
        error: 'Contact number, course, and year level are required for students'
      });
    }

    // Validate role
    const validRoles = ['Faculty Staff', 'Student'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: 'Invalid role. Must be Faculty Staff or Student'
      });
    }

    // Check if email already exists
    const existingEmail = await getRow('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await runQuery(
      'INSERT INTO users (password, email, full_name, role, status) VALUES (?, ?, ?, ?, ?)',
      [hashedPassword, email, fullName, role, 'pending']
    );

    // If registering as student, also create student record
    if (role === 'Student') {
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      await runQuery(
        'INSERT INTO students (first_name, last_name, course, year_level, contact_number, email, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [firstName, lastName, course, parseInt(yearLevel), contactNumber, email, 'Active']
      );
    }

    const newUser = await getRow('SELECT user_id, email, full_name, role, created_at FROM users WHERE user_id = ?', [result.insertId]);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.user_id,
        email: newUser.email,
        fullName: newUser.full_name,
        role: newUser.role,
        createdAt: newUser.created_at
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await getRow('SELECT * FROM users WHERE email = ?', [email]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status !== 'approved') {
      let message = 'Account not approved';
      if (user.status === 'pending') message = 'Your account is pending approval.';
      else if (user.status === 'rejected') message = 'Your account registration has been rejected.';
      else if (user.status === 'suspended') message = 'Your account is suspended.';
      return res.status(403).json({ error: message });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.user_id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.user_id,
        email: user.email,
        fullName: user.full_name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify token middleware
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get all users (admin only)
router.get('/users', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    const user = await getRow('SELECT role FROM users WHERE user_id = ?', [req.user.id]);
    if (!user || user.role !== 'Admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const users = await getAllRows(
      'SELECT user_id, email, full_name, role, created_at FROM users ORDER BY created_at DESC'
    );

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Protected route example
router.get('/verify', verifyToken, (req, res) => {
  res.json({ message: 'Token is valid', user: req.user });
});

module.exports = router;
module.exports.verifyToken = verifyToken;