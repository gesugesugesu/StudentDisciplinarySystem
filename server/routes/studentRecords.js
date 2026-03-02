const express = require('express');
const { getAllRows, getRow, runQuery } = require('../database/db');
const { verifyToken } = require('./auth');

const router = express.Router();

// Get all disciplinary records with filters
router.get('/', verifyToken, async (req, res) => {
  const { status, studentId, search } = req.query;
  
  let query = `
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
           v.category as severity,
           v.description,
           u.full_name as reportedByName
    FROM disciplinary_records dr
    LEFT JOIN students s ON dr.student_id = s.student_id
    LEFT JOIN violations v ON dr.violation_id = v.violation_id
    LEFT JOIN users u ON dr.reported_by = u.user_id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (status && status !== 'All') {
    query += ' AND dr.status = ?';
    params.push(status);
  }
  
  if (studentId) {
    query += ' AND dr.student_id = ?';
    params.push(studentId);
  }
  
  if (search) {
    query += ' AND (s.first_name LIKE ? OR s.last_name LIKE ? OR v.violation_name LIKE ?)';
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }
  
  query += ' ORDER BY dr.date_reported DESC';

  try {
    const records = await getAllRows(query, params);
    
    // Transform to match frontend expectations
    const transformedRecords = records.map(record => ({
      id: record.id.toString(),
      studentId: record.student_id.toString(),
      studentName: `${record.first_name} ${record.last_name}`,
      grade: record.grade || '',
      class: record.year_level ? `Year ${record.year_level}` : '',
      type: record.type,
      severity: record.severity || 'Category 1 Offense',
      description: record.description,
      status: record.status || 'Pending',
      reportedBy: record.reportedByName || 'Unknown',
      date: record.date,
      communicationLogs: []
    }));

    res.json(transformedRecords);
  } catch (error) {
    console.error('Error fetching disciplinary records:', error);
    res.status(500).json({ error: 'Failed to fetch disciplinary records' });
  }
});

// Get single record by ID
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
             v.category as severity,
             v.description,
             u.full_name as reportedByName
      FROM disciplinary_records dr
      LEFT JOIN students s ON dr.student_id = s.student_id
      LEFT JOIN violations v ON dr.violation_id = v.violation_id
      LEFT JOIN users u ON dr.reported_by = u.user_id
      WHERE dr.record_id = ?
    `, [req.params.id]);

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const transformedRecord = {
      id: record.id.toString(),
      studentId: record.student_id.toString(),
      studentName: `${record.first_name} ${record.last_name}`,
      grade: record.grade || '',
      class: record.year_level ? `Year ${record.year_level}` : '',
      type: record.type,
      severity: record.severity || 'Category 1 Offense',
      description: record.description,
      status: record.status || 'Pending',
      reportedBy: record.reportedByName || 'Unknown',
      date: record.date,
      communicationLogs: []
    };

    res.json(transformedRecord);
  } catch (error) {
    console.error('Error fetching disciplinary record:', error);
    res.status(500).json({ error: 'Failed to fetch disciplinary record' });
  }
});

module.exports = router;
