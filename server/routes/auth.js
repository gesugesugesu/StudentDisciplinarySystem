const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getRow, getAllRows, runQuery } = require('../database/db');

const router = express.Router();

// Register new user (admin/faculty)
router.post('/register', async (req, res) => {
  try {
    const { password, email, fullName, role, studentId, contactNumber, course, yearLevel, educationLevel } = req.body;

    if (!password || !email || !fullName || !role) {
      return res.status(400).json({
        error: 'Password, email, full name, and role are required'
      });
    }

    if (role === 'Student' && (!contactNumber || !yearLevel || !educationLevel)) {
      return res.status(400).json({
        error: 'Contact number, education level, and year level are required for students'
      });
    }

    // Course is required for College students
    if (role === 'Student' && educationLevel === 'College' && !course) {
      return res.status(400).json({
        error: 'Course is required for college students'
      });
    }

    // If course is provided for College students, check if it exists in courses table and add if not
    let finalCourse = course;
    if (role === 'Student' && educationLevel === 'College' && course) {
      const existingCourse = await getRow('SELECT course_id FROM courses WHERE course_name = ?', [course]);
      if (!existingCourse) {
        // Add the new course to the courses table
        await runQuery('INSERT INTO courses (course_name) VALUES (?)', [course]);
        console.log('New course added:', course);
      }
      finalCourse = course;
    }

    // Validate role
    const validRoles = ['Discipline Officer', 'Student'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: 'Invalid role. Must be Discipline Officer or Student'
      });
    }

    // Check if email already exists
    const existingEmail = await getRow('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash password
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
        'INSERT INTO students (first_name, last_name, course, year_level, contact_number, email, education_level, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [firstName, lastName, finalCourse || null, parseInt(yearLevel), contactNumber, email, educationLevel, 'Active']
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
    res.status(500).json({ error: 'Registration failed due to server error. Please try again.' });
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

    // For students, check if student record exists and create if not
    if (user.role === 'Student') {
      const existingStudent = await getRow('SELECT student_id FROM students WHERE email = ?', [user.email]);
      if (!existingStudent) {
        // Create student record from user data - use INSERT IGNORE to prevent race conditions
        const nameParts = (user.full_name || '').split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        try {
          const result = await runQuery(
            'INSERT IGNORE INTO students (first_name, last_name, email, status) VALUES (?, ?, ?, ?)',
            [firstName, lastName, user.email, 'Active']
          );

          if (result.affectedRows > 0) {
            console.log('Created student record for user:', user.email);
          } else {
            console.log('Student record already exists for user:', user.email);
          }
        } catch (error) {
          // Check if it's a duplicate entry error (which is expected in race conditions)
          if (error.code === 'ER_DUP_ENTRY') {
            console.log('Student record creation skipped due to concurrent creation for user:', user.email);
          } else {
            console.error('Error creating student record:', error);
            // Don't fail the login, just log the error
          }
        }
      }
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
    res.status(500).json({ error: 'Login failed due to server error. Please try again.' });
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
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get all users (Super Admin and Discipline Officer only)
router.get('/users', verifyToken, async (req, res) => {
  try {
    // Check if user is Super Admin or Discipline Officer
    const user = await getRow('SELECT role FROM users WHERE user_id = ?', [req.user.id]);
    if (!user || (user.role !== 'Super Admin' && user.role !== 'Discipline Officer')) {
      return res.status(403).json({ error: 'Access denied. Super Admin or Discipline Officer role required.' });
    }

    const users = await getAllRows(
      'SELECT user_id, email, full_name, role, created_at FROM users ORDER BY created_at DESC'
    );

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users. Please try again.' });
  }
});

// Refresh token route
router.post('/refresh', verifyToken, async (req, res) => {
  try {
    // Verify user still exists and is approved
    const user = await getRow('SELECT user_id, email, full_name, role, status FROM users WHERE user_id = ?', [req.user.id]);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.status !== 'approved') {
      return res.status(401).json({ error: 'Account not approved' });
    }

    // Generate new token
    const newToken = jwt.sign(
      { id: user.user_id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Token refreshed successfully',
      token: newToken,
      user: {
        id: user.user_id,
        email: user.email,
        fullName: user.full_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// Protected route example
router.get('/verify', verifyToken, (req, res) => {
  res.json({ message: 'Token is valid', user: req.user });
});

module.exports = router;
module.exports.verifyToken = verifyToken;