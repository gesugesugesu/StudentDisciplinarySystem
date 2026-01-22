const express = require('express');
const { runQuery, getRow, getAllRows } = require('../database/db');
const { verifyToken } = require('./auth');

const router = express.Router();

// Get all students
router.get('/', verifyToken, async (req, res) => {
  try {
    const students = await getAllRows(`
      SELECT student_id as id,
             CONCAT(first_name, ' ', last_name) as name,
             course as grade,
             year_level as yearLevel,
             status,
             created_at
      FROM students
      ORDER BY last_name, first_name
    `);

    // Transform to match frontend expectations
    const transformedStudents = students.map(student => ({
      id: student.id.toString(),
      name: student.name,
      grade: student.grade || '',
      class: student.yearLevel ? `Year ${student.yearLevel}` : '',
      email: '', // Not in current schema
      status: student.status,
      createdAt: student.created_at
    }));

    res.json(transformedStudents);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get student by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const student = await getRow(`
      SELECT student_id as id,
             student_number,
             first_name,
             last_name,
             course as grade,
             year_level as yearLevel,
             status,
             created_at
      FROM students
      WHERE student_id = ?
    `, [req.params.id]);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Transform to match frontend expectations
    const transformedStudent = {
      id: student.id.toString(),
      name: `${student.first_name} ${student.last_name}`,
      grade: student.grade || '',
      class: student.yearLevel ? `Year ${student.yearLevel}` : '',
      email: '', // Not in current schema
      status: student.status,
      studentNumber: student.student_number,
      createdAt: student.created_at
    };

    res.json(transformedStudent);
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new student
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, grade, class: className, email } = req.body;

    if (!name || !grade) {
      return res.status(400).json({ error: 'Name and grade are required' });
    }

    // Split name into first and last
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Extract year level from class
    const yearLevel = className ? parseInt(className.replace('Year ', '')) || null : null;

    const result = await runQuery(
      `INSERT INTO students (student_number, first_name, last_name, course, year_level, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [`${Date.now()}`, firstName, lastName, grade, yearLevel, 'Active']
    );

    const newStudent = await getRow(`
      SELECT student_id as id,
             CONCAT(first_name, ' ', last_name) as name,
             course as grade,
             year_level as yearLevel,
             status
      FROM students
      WHERE student_id = ?
    `, [result.insertId]);

    // Transform response
    const transformedStudent = {
      id: newStudent.id.toString(),
      name: newStudent.name,
      grade: newStudent.grade || '',
      class: newStudent.yearLevel ? `Year ${newStudent.yearLevel}` : '',
      email: '',
      status: newStudent.status
    };

    res.status(201).json(transformedStudent);
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update student
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { name, grade, class: className, email } = req.body;

    if (!name || !grade) {
      return res.status(400).json({ error: 'Name and grade are required' });
    }

    // Check if student exists
    const existingStudent = await getRow('SELECT student_id FROM students WHERE student_id = ?', [req.params.id]);
    if (!existingStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Split name into first and last
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Extract year level from class
    const yearLevel = className ? parseInt(className.replace('Year ', '')) || null : null;

    await runQuery(
      `UPDATE students SET
       first_name = ?, last_name = ?, course = ?, year_level = ?
       WHERE student_id = ?`,
      [firstName, lastName, grade, yearLevel, req.params.id]
    );

    const updatedStudent = await getRow(`
      SELECT student_id as id,
             CONCAT(first_name, ' ', last_name) as name,
             course as grade,
             year_level as yearLevel,
             status
      FROM students
      WHERE student_id = ?
    `, [req.params.id]);

    // Transform response
    const transformedStudent = {
      id: updatedStudent.id.toString(),
      name: updatedStudent.name,
      grade: updatedStudent.grade || '',
      class: updatedStudent.yearLevel ? `Year ${updatedStudent.yearLevel}` : '',
      email: '',
      status: updatedStudent.status
    };

    res.json(transformedStudent);
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete student
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    // Check if student exists
    const student = await getRow('SELECT student_id FROM students WHERE student_id = ?', [req.params.id]);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if student has disciplinary records
    const records = await getAllRows('SELECT record_id FROM disciplinary_records WHERE student_id = ?', [req.params.id]);
    if (records.length > 0) {
      return res.status(400).json({ error: 'Cannot delete student with existing disciplinary records' });
    }

    await runQuery('DELETE FROM students WHERE student_id = ?', [req.params.id]);
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;