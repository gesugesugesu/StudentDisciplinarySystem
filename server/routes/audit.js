const express = require('express');
const { runQuery, getRow, getAllRows } = require('../database/db');
const { verifyToken } = require('./auth');

const router = express.Router();

// Get all audit logs
router.get('/', verifyToken, async (req, res) => {
  try {
    // Check if user is Super Admin or Discipline Officer
    const user = await getRow('SELECT role FROM users WHERE user_id = ?', [req.user.id]);
    if (!user || (user.role !== 'Super Admin' && user.role !== 'Discipline Officer')) {
      return res.status(403).json({ error: 'Access denied. Super Admin or Discipline Officer role required.' });
    }

    const logs = await getAllRows(`
      SELECT al.*,
             u.full_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.user_id
      ORDER BY al.timestamp DESC
      LIMIT 1000
    `);

    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get audit logs for a specific user
router.get('/user/:userId', verifyToken, async (req, res) => {
  try {
    // Check if user is Super Admin, Discipline Officer, or user themselves
    const currentUser = await getRow('SELECT role FROM users WHERE user_id = ?', [req.user.id]);
    if (!currentUser || (currentUser.role !== 'Super Admin' && currentUser.role !== 'Discipline Officer' && req.user.id != req.params.userId)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const logs = await getAllRows(`
      SELECT al.*,
             u.full_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.user_id
      WHERE al.user_id = ?
      ORDER BY al.timestamp DESC
      LIMIT 500
    `, [req.params.userId]);

    res.json(logs);
  } catch (error) {
    console.error('Error fetching user audit logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create audit log entry (internal function)
async function logAction(userId, action, details = null) {
  try {
    await runQuery(
      'INSERT INTO audit_logs (user_id, action) VALUES (?, ?)',
      [userId, action]
    );
  } catch (error) {
    console.error('Error logging action:', error);
    // Don't throw error for logging failures
  }
}

// Manual audit log creation (for specific actions)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { action } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    await logAction(req.user.id, action);

    res.status(201).json({ message: 'Audit log created successfully' });
  } catch (error) {
    console.error('Error creating audit log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get audit statistics
router.get('/stats/summary', verifyToken, async (req, res) => {
  try {
    // Check if user is Super Admin or Discipline Officer
    const user = await getRow('SELECT role FROM users WHERE user_id = ?', [req.user.id]);
    if (!user || (user.role !== 'Super Admin' && user.role !== 'Discipline Officer')) {
      return res.status(403).json({ error: 'Access denied. Super Admin or Discipline Officer role required.' });
    }

    // Get total logs count
    const totalLogs = await getRow('SELECT COUNT(*) as count FROM audit_logs');

    // Get logs by action type
    const actionStats = await getAllRows(`
      SELECT action, COUNT(*) as count
      FROM audit_logs
      GROUP BY action
      ORDER BY count DESC
      LIMIT 10
    `);

    // Get recent activity (last 7 days)
    const recentActivity = await getAllRows(`
      SELECT DATE(timestamp) as date, COUNT(*) as count
      FROM audit_logs
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `);

    res.json({
      totalLogs: totalLogs.count,
      actionStats,
      recentActivity
    });
  } catch (error) {
    console.error('Error fetching audit statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
module.exports.logAction = logAction;
