const express = require('express');
const { getRow, getAllRows, runQuery } = require('../database/db');
const { verifyToken } = require('./auth');

const router = express.Router();

// Middleware for admin check
const requireAdmin = async (req, res, next) => {
  try {
    const user = await getRow('SELECT role FROM users WHERE user_id = ?', [req.user.id]);
    if (!user || user.role !== 'Admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// List all users
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const users = await getAllRows(
      'SELECT user_id, email, full_name, role, status, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pending approvals
router.get('/pending', verifyToken, requireAdmin, async (req, res) => {
  try {
    const pendingUsers = await getAllRows(
      'SELECT user_id, email, full_name, role, created_at FROM users WHERE status = ? ORDER BY created_at DESC',
      ['pending']
    );
    res.json(pendingUsers);
  } catch (error) {
    console.error('Error fetching pending users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user role
router.put('/:id/role', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['Admin', 'Student', 'Faculty Staff', 'Super Admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be Admin, Student, or Faculty Staff' });
    }

    const result = await runQuery('UPDATE users SET role = ? WHERE user_id = ?', [role, req.params.id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Suspend/activate user
router.put('/:id/status', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['approved', 'suspended', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be approved or suspended' });
    }

    const result = await runQuery('UPDATE users SET status = ? WHERE user_id = ?', [status, req.params.id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User status updated successfully' });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await runQuery('DELETE FROM users WHERE user_id = ?', [req.params.id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;