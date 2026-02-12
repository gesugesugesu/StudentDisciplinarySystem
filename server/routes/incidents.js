const express = require('express');
const { runQuery, getRow, getAllRows } = require('../database/db');
const { verifyToken } = require('./auth');

const router = express.Router();

// Get all disciplinary cases
router.get('/', verifyToken, async (req, res) => {
  try {
    const records = await getAllRows(`
      SELECT dc.case_id as id,
             dc.student_id,
             dc.violation_id,
             dc.reported_by,
             dc.date_reported as date,
             dc.case_status as status,
             s.first_name,
             s.last_name,
             s.course as grade,
             s.year_level,
             v.violation_name as type,
             v.severity_level as severity,
             v.description,
             u.full_name as reportedByName
      FROM disciplinary_cases dc
      LEFT JOIN students s ON dc.student_id = s.student_id
      LEFT JOIN violations v ON dc.violation_id = v.violation_id
      LEFT JOIN users u ON dc.reported_by = u.user_id
      ORDER BY dc.date_reported DESC
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
    console.error('Error fetching disciplinary cases:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get disciplinary case by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const record = await getRow(`
      SELECT dc.case_id as id,
             dc.student_id,
             dc.violation_id,
             dc.reported_by,
             dc.date_reported as date,
             dc.case_status as status,
             s.first_name,
             s.last_name,
             s.course as grade,
             s.year_level,
             v.violation_name as type,
             v.severity_level as severity,
             v.description,
             u.full_name as reportedByName
      FROM disciplinary_cases dc
      LEFT JOIN students s ON dc.student_id = s.student_id
      LEFT JOIN violations v ON dc.violation_id = v.violation_id
      LEFT JOIN users u ON dc.reported_by = u.user_id
      WHERE dc.case_id = ?
    `, [req.params.id]);

    if (!record) {
      return res.status(404).json({ error: 'Disciplinary case not found' });
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
    console.error('Error fetching disciplinary case:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new disciplinary case
router.post('/', verifyToken, async (req, res) => {
  try {
    const { studentId, type, severity, description, status, date } = req.body;

    if (!studentId || !type || !date) {
      return res.status(400).json({ error: 'Student ID, type, and date are required' });
    }

    // Check if student exists
    const student = await getRow('SELECT student_id FROM students WHERE student_id = ?', [studentId]);
    if (!student) {
      return res.status(400).json({ error: 'Invalid student ID' });
    }

    // Find violation by name
    let violation = await getRow('SELECT violation_id as id FROM violations WHERE violation_name = ?', [type]);
    if (!violation) {
      // Auto-create the violation if it doesn't exist
      const defaultCategory = 'General';
      const defaultSeverity = severity || 'Minor';
      const insertResult = await runQuery(
        'INSERT INTO violations (violation_name, category, severity_level, description) VALUES (?, ?, ?, ?)',
        [type, defaultCategory, defaultSeverity, description || 'Auto-created from incident submission']
      );
      violation = { id: insertResult.insertId };
    }

    // Get the current user ID from the token
    const reportedById = req.user?.id || null;

    if (!reportedById) {
      return res.status(400).json({ error: 'Unable to identify the reporting user' });
    }

    const result = await runQuery(
      `INSERT INTO disciplinary_cases (student_id, violation_id, reported_by, date_reported, case_status)
       VALUES (?, ?, ?, ?, ?)`,
      [studentId, violation.id, reportedById, date, status || 'Pending']
    );

    const newRecord = await getRow(`
      SELECT dc.case_id as id,
             dc.student_id,
             dc.violation_id,
             dc.reported_by,
             dc.date_reported as date,
             dc.case_status as status,
             s.first_name,
             s.last_name,
             s.course as grade,
             s.year_level,
             v.violation_name as type,
             v.severity_level as severity,
             v.description,
             u.full_name as reportedByName
      FROM disciplinary_cases dc
      LEFT JOIN students s ON dc.student_id = s.student_id
      LEFT JOIN violations v ON dc.violation_id = v.violation_id
      LEFT JOIN users u ON dc.reported_by = u.user_id
      WHERE dc.case_id = ?
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
      status: newRecord.status || 'Pending',
      reportedBy: newRecord.reportedByName || 'Unknown',
      date: newRecord.date,
      communicationLogs: []
    };

    res.status(201).json(transformedRecord);
  } catch (error) {
    console.error('Error creating disciplinary case:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update disciplinary case
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { studentId, type, status, date } = req.body;

    if (!studentId || !type || !date) {
      return res.status(400).json({ error: 'Student ID, type, and date are required' });
    }

    // Check if record exists
    const existingRecord = await getRow('SELECT case_id FROM disciplinary_cases WHERE case_id = ?', [req.params.id]);
    if (!existingRecord) {
      return res.status(404).json({ error: 'Disciplinary case not found' });
    }

    // Check if student exists
    const student = await getRow('SELECT student_id FROM students WHERE student_id = ?', [studentId]);
    if (!student) {
      return res.status(400).json({ error: 'Invalid student ID' });
    }

    // Find violation by name
    const violation = await getRow('SELECT violation_id as id FROM violations WHERE violation_name = ?', [type]);
    if (!violation) {
      return res.status(400).json({ error: 'Invalid violation type' });
    }

    await runQuery(
      `UPDATE disciplinary_cases SET
       student_id = ?, violation_id = ?, date_reported = ?, case_status = ?
       WHERE case_id = ?`,
      [studentId, violation.id, date, status || 'Pending', req.params.id]
    );

    const updatedRecord = await getRow(`
      SELECT dc.case_id as id,
             dc.student_id,
             dc.violation_id,
             dc.reported_by,
             dc.date_reported as date,
             dc.case_status as status,
             s.first_name,
             s.last_name,
             s.course as grade,
             s.year_level,
             v.violation_name as type,
             v.severity_level as severity,
             v.description,
             u.full_name as reportedByName
      FROM disciplinary_cases dc
      LEFT JOIN students s ON dc.student_id = s.student_id
      LEFT JOIN violations v ON dc.violation_id = v.violation_id
      LEFT JOIN users u ON dc.reported_by = u.user_id
      WHERE dc.case_id = ?
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
      status: updatedRecord.status || 'Pending',
      reportedBy: updatedRecord.reportedByName || 'Unknown',
      date: updatedRecord.date,
      communicationLogs: []
    };

    res.json(transformedRecord);
  } catch (error) {
    console.error('Error updating disciplinary case:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete disciplinary case
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    // Check if record exists
    const record = await getRow('SELECT case_id FROM disciplinary_cases WHERE case_id = ?', [req.params.id]);
    if (!record) {
      return res.status(404).json({ error: 'Disciplinary case not found' });
    }

    // Delete sanctions first
    await runQuery('DELETE FROM sanctions WHERE record_id = ?', [req.params.id]);

    // Delete record
    await runQuery('DELETE FROM disciplinary_cases WHERE case_id = ?', [req.params.id]);

    res.json({ message: 'Disciplinary case deleted successfully' });
  } catch (error) {
    console.error('Error deleting disciplinary case:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get violations list
router.get('/violations/list', verifyToken, async (req, res) => {
  try {
    const violations = await getAllRows('SELECT violation_id as id, violation_name as name, category, severity_level as severity, description FROM violations ORDER BY violation_name');
    res.json(violations);
  } catch (error) {
    console.error('Error fetching violations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
