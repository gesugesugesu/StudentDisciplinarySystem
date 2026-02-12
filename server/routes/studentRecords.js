const express = require('express');
const { runQuery, getRow, getAllRows } = require('../database/db');
const { verifyToken } = require('./auth');

const router = express.Router();

// Get all disciplinary records
router.get('/', verifyToken, async (req, res) => {
  try {
    const records = await getAllRows(`
      SELECT dr.record_id as id,
             dr.student_id,
             dr.violation_id,
             dr.reported_by,
             dr.date_reported as date,
             dr.status,
             s.first_name,
             s.last_name,
             s.course as grade,
             s.year_level,
             v.violation_name as type,
             v.severity_level as severity,
             v.description,
             u.full_name as reportedByName
      FROM disciplinary_records dr
      LEFT JOIN students s ON dr.student_id = s.student_id
      LEFT JOIN violations v ON dr.violation_id = v.violation_id
      LEFT JOIN users u ON dr.reported_by = u.user_id
      ORDER BY dr.date_reported DESC
    `);

    // Transform to match frontend expectations
    const transformedRecords = records.map(record => ({
      id: record.id.toString(),
      studentId: record.student_id.toString(),
      studentName: `${record.first_name} ${record.last_name}`,
      grade: record.grade || '',
      class: record.year_level ? `Year ${record.year_level}` : '',
      type: record.type,
      severity: record.severity,
      description: record.description,
      status: record.status || 'Pending',
      reportedBy: record.reportedByName || 'Unknown',
      date: record.date,
      communicationLogs: []
    }));

    res.json(transformedRecords);
  } catch (error) {
    console.error('Error fetching disciplinary records:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get disciplinary record by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const record = await getRow(`
      SELECT dr.record_id as id,
             dr.student_id,
             dr.violation_id,
             dr.reported_by,
             dr.date_reported as date,
             dr.status,
             s.first_name,
             s.last_name,
             s.course as grade,
             s.year_level,
             v.violation_name as type,
             v.severity_level as severity,
             v.description,
             u.full_name as reportedByName
      FROM disciplinary_records dr
      LEFT JOIN students s ON dr.student_id = s.student_id
      LEFT JOIN violations v ON dr.violation_id = v.violation_id
      LEFT JOIN users u ON dr.reported_by = u.user_id
      WHERE dr.record_id = ?
    `, [req.params.id]);

    if (!record) {
      return res.status(404).json({ error: 'Disciplinary record not found' });
    }

    // Transform to match frontend expectations
    const transformedRecord = {
      id: record.id.toString(),
      studentId: record.student_id.toString(),
      studentName: `${record.first_name} ${record.last_name}`,
      grade: record.grade || '',
      class: record.year_level ? `Year ${record.year_level}` : '',
      type: record.type,
      severity: record.severity,
      description: record.description,
      status: record.status || 'Pending',
      reportedBy: record.reportedByName || 'Unknown',
      date: record.date,
      communicationLogs: []
    };

    res.json(transformedRecord);
  } catch (error) {
    console.error('Error fetching disciplinary record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update disciplinary record status
router.put('/:id/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Check if record exists
    const existingRecord = await getRow('SELECT record_id FROM disciplinary_records WHERE record_id = ?', [req.params.id]);
    if (!existingRecord) {
      return res.status(404).json({ error: 'Disciplinary record not found' });
    }

    await runQuery(
      `UPDATE disciplinary_records SET status = ? WHERE record_id = ?`,
      [status, req.params.id]
    );

    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error('Error updating disciplinary record status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete disciplinary record
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    // Check if record exists
    const record = await getRow('SELECT record_id FROM disciplinary_records WHERE record_id = ?', [req.params.id]);
    if (!record) {
      return res.status(404).json({ error: 'Disciplinary record not found' });
    }

    // Delete sanctions first
    await runQuery('DELETE FROM sanctions WHERE record_id = ?', [req.params.id]);

    // Delete record
    await runQuery('DELETE FROM disciplinary_records WHERE record_id = ?', [req.params.id]);

    res.json({ message: 'Disciplinary record deleted successfully' });
  } catch (error) {
    console.error('Error deleting disciplinary record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
