const express = require('express');
const { runQuery, getRow, getAllRows } = require('../database/db');
const { verifyToken } = require('./auth');

const router = express.Router();

// Get all disciplinary records (incidents)
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
             u.username as reportedByName
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
      status: record.status,
      reportedBy: record.reportedByName || 'Unknown',
      date: record.date,
      communicationLogs: [] // Will be populated separately if needed
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
      status: record.status,
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

// Create new disciplinary record
router.post('/', verifyToken, async (req, res) => {
  try {
    const { studentId, type, severity, description, status, reportedBy, date } = req.body;

    if (!studentId || !type || !date) {
      return res.status(400).json({ error: 'Student ID, type, and date are required' });
    }

    // Check if student exists
    const student = await getRow('SELECT student_id FROM students WHERE student_id = ?', [studentId]);
    if (!student) {
      return res.status(400).json({ error: 'Invalid student ID' });
    }

    // Find violation by name
    const violation = await getRow('SELECT violation_id FROM violations WHERE violation_name = ?', [type]);
    if (!violation) {
      return res.status(400).json({ error: 'Invalid violation type' });
    }

    // Find user by email for reported_by
    const user = await getRow('SELECT user_id FROM users WHERE email = ?', [reportedBy]);
    const reportedById = user ? user.user_id : null;

    const result = await runQuery(
      `INSERT INTO disciplinary_records (student_id, violation_id, reported_by, date_reported, status)
       VALUES (?, ?, ?, ?, ?)`,
      [studentId, violation.violation_id, reportedById, date, status || 'Pending']
    );

    const newRecord = await getRow(`
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
    `, [result.insertId]);

    // Transform response
    const transformedRecord = {
      id: newRecord.id.toString(),
      studentId: newRecord.student_id.toString(),
      studentName: `${newRecord.first_name} ${newRecord.last_name}`,
      grade: newRecord.grade || '',
      class: newRecord.year_level ? `Year ${newRecord.year_level}` : '',
      type: newRecord.type,
      severity: newRecord.severity,
      description: newRecord.description,
      status: newRecord.status,
      reportedBy: newRecord.reportedByName || 'Unknown',
      date: newRecord.date,
      communicationLogs: []
    };

    res.status(201).json(transformedRecord);
  } catch (error) {
    console.error('Error creating disciplinary record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update disciplinary record
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { studentId, type, status, date } = req.body;

    if (!studentId || !type || !date) {
      return res.status(400).json({ error: 'Student ID, type, and date are required' });
    }

    // Check if record exists
    const existingRecord = await getRow('SELECT record_id FROM disciplinary_records WHERE record_id = ?', [req.params.id]);
    if (!existingRecord) {
      return res.status(404).json({ error: 'Disciplinary record not found' });
    }

    // Check if student exists
    const student = await getRow('SELECT student_id FROM students WHERE student_id = ?', [studentId]);
    if (!student) {
      return res.status(400).json({ error: 'Invalid student ID' });
    }

    // Find violation by name
    const violation = await getRow('SELECT violation_id FROM violations WHERE violation_name = ?', [type]);
    if (!violation) {
      return res.status(400).json({ error: 'Invalid violation type' });
    }

    await runQuery(
      `UPDATE disciplinary_records SET
       student_id = ?, violation_id = ?, date_reported = ?, status = ?
       WHERE record_id = ?`,
      [studentId, violation.violation_id, date, status || 'Pending', req.params.id]
    );

    const updatedRecord = await getRow(`
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
             u.username as reportedByName
      FROM disciplinary_records dr
      LEFT JOIN students s ON dr.student_id = s.student_id
      LEFT JOIN violations v ON dr.violation_id = v.violation_id
      LEFT JOIN users u ON dr.reported_by = u.user_id
      WHERE dr.record_id = ?
    `, [req.params.id]);

    // Transform response
    const transformedRecord = {
      id: updatedRecord.id.toString(),
      studentId: updatedRecord.student_id.toString(),
      studentName: `${updatedRecord.first_name} ${updatedRecord.last_name}`,
      grade: updatedRecord.grade || '',
      class: updatedRecord.year_level ? `Year ${updatedRecord.year_level}` : '',
      type: updatedRecord.type,
      severity: updatedRecord.severity,
      description: updatedRecord.description,
      status: updatedRecord.status,
      reportedBy: updatedRecord.reportedByName || 'Unknown',
      date: updatedRecord.date,
      communicationLogs: []
    };

    res.json(transformedRecord);
  } catch (error) {
    console.error('Error updating disciplinary record:', error);
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

// Get violations list
router.get('/violations/list', verifyToken, async (req, res) => {
  try {
    const violations = await getAllRows('SELECT * FROM violations ORDER BY violation_name');
    res.json(violations);
  } catch (error) {
    console.error('Error fetching violations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;