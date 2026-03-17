const express = require('express');
const { getAllRows, getRow, runQuery } = require('../database/db');
const { verifyToken } = require('./auth');

const router = express.Router();

// Search offenses/violations by name (partial match)
router.get('/search-offenses', verifyToken, async (req, res) => {
  const { query } = req.query;
  
  if (!query) {
    return res.json([]);
  }
  
  try {
    const searchPattern = `%${query}%`;
    const offenses = await getAllRows(
      `SELECT violation_id as id, violation_name as name, category as severity, description 
       FROM violations 
       WHERE violation_name LIKE ? 
       ORDER BY violation_name ASC 
       LIMIT 20`,
      [searchPattern]
    );
    res.json(offenses);
  } catch (error) {
    console.error('Error searching offenses:', error);
    res.status(500).json({ error: 'Failed to search offenses' });
  }
});

// Get students by offense/violation
router.get('/by-offense/:violationId', verifyToken, async (req, res) => {
  const { violationId } = req.params;
  const { sort = 'date_desc' } = req.query;
  
  try {
    let orderClause = 'ORDER BY dr.date_reported DESC';
    if (sort === 'date_asc') {
      orderClause = 'ORDER BY dr.date_reported ASC';
    }
    
    const query = `
      SELECT dr.record_id as id,
             dr.student_id,
             dr.violation_id,
             dr.reported_by,
             dr.date_reported as date,
             dr.status,
             s.first_name,
             s.last_name,
             s.student_id as studentIdNumber,
             s.course as grade,
             s.year_level,
             v.violation_name as type,
             v.category as offenseCategory,
             v.description,
             u.full_name as reportedByName
      FROM disciplinary_records dr
      LEFT JOIN students s ON dr.student_id = s.student_id
      LEFT JOIN violations v ON dr.violation_id = v.violation_id
      LEFT JOIN users u ON dr.reported_by = u.user_id
      WHERE dr.violation_id = ?
      ${orderClause}
    `;
    
    const records = await getAllRows(query, [violationId]);
    
    // Transform to match frontend expectations
    const transformedRecords = records.map(record => ({
      id: record.id.toString(),
      studentId: record.student_id ? record.student_id.toString() : record.studentIdNumber?.toString() || '',
      studentName: `${record.first_name || ''} ${record.last_name || ''}`.trim() || 'Unknown',
      studentIdNumber: record.studentIdNumber ? record.studentIdNumber.toString() : '',
      grade: record.grade || '',
      class: record.year_level ? `Year ${record.year_level}` : '',
      type: record.type,
      offenseCategory: record.offenseCategory || 'Category 1 Offense',
      severity: record.offenseCategory || 'Category 1 Offense',
      description: record.description,
      status: record.status || 'Pending',
      reportedBy: record.reportedByName || 'Unknown',
      date: record.date,
      communicationLogs: []
    }));

    res.json(transformedRecords);
  } catch (error) {
    console.error('Error fetching students by offense:', error);
    res.status(500).json({ error: 'Failed to fetch students by offense' });
  }
});

// Get all disciplinary records with filters - grouped by student
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
  
  // Sort by student name ascending, then by date descending
  query += ' ORDER BY s.last_name ASC, s.first_name ASC, dr.date_reported DESC';

  try {
    const records = await getAllRows(query, params);
    
    // Group records by student
    const groupedRecords = {};
    records.forEach(record => {
      const studentName = `${record.first_name} ${record.last_name}`.trim();
      const studentKey = record.student_id.toString();
      
      if (!groupedRecords[studentKey]) {
        groupedRecords[studentKey] = {
          studentId: studentKey,
          studentName: studentName || 'Unknown',
          grade: record.grade || '',
          class: record.year_level ? `Year ${record.year_level}` : '',
          violations: []
        };
      }
      
      groupedRecords[studentKey].violations.push({
        id: record.id.toString(),
        violationId: record.violation_id ? record.violation_id.toString() : '',
        type: record.type,
        severity: record.severity || 'Category 1 Offense',
        description: record.description,
        status: record.status || 'Pending',
        reportedBy: record.reportedByName || 'Unknown',
        date: record.date
      });
    });
    
    // Convert to array and sort by student name
    const transformedRecords = Object.values(groupedRecords).sort((a, b) => 
      a.studentName.localeCompare(b.studentName)
    );

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
