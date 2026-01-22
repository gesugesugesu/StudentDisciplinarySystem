const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { runQuery, getRow, getAllRows } = require('../database/db');
const { verifyToken } = require('./auth');

const router = express.Router();

// Get all students
router.get('/', verifyToken, async (req, res) => {
  try {
    const students = await getAllRows('SELECT * FROM students ORDER BY name');
    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get student by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const student = await getRow('SELECT * FROM students WHERE id = ?', [req.params.id]);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new student
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, grade, class: className, email, parentName, parentEmail, parentPhone } = req.body;

    if (!name || !grade || !className || !email) {
      return res.status(400).json({ error: 'Name, grade, class, and email are required' });
    }

    // Check if email already exists
    const existingStudent = await getRow('SELECT id FROM students WHERE email = ?', [email]);
    if (existingStudent) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const id = uuidv4();

    await runQuery(
      `INSERT INTO students (id, name, grade, class, email, parentName, parentEmail, parentPhone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, grade, className, email, parentName, parentEmail, parentPhone]
    );

    const newStudent = await getRow('SELECT * FROM students WHERE id = ?', [id]);
    res.status(201).json(newStudent);
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update student
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { name, grade, class: className, email, parentName, parentEmail, parentPhone } = req.body;

    if (!name || !grade || !className || !email) {
      return res.status(400).json({ error: 'Name, grade, class, and email are required' });
    }

    // Check if student exists
    const existingStudent = await getRow('SELECT id FROM students WHERE id = ?', [req.params.id]);
    if (!existingStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if email is taken by another student
    const emailCheck = await getRow('SELECT id FROM students WHERE email = ? AND id != ?', [email, req.params.id]);
    if (emailCheck) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    await runQuery(
      `UPDATE students SET
       name = ?, grade = ?, class = ?, email = ?, parentName = ?, parentEmail = ?, parentPhone = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, grade, className, email, parentName, parentEmail, parentPhone, req.params.id]
    );

    const updatedStudent = await getRow('SELECT * FROM students WHERE id = ?', [req.params.id]);
    res.json(updatedStudent);
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete student
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    // Check if student exists
    const student = await getRow('SELECT id FROM students WHERE id = ?', [req.params.id]);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if student has incidents
    const incidents = await getAllRows('SELECT id FROM incidents WHERE studentId = ?', [req.params.id]);
    if (incidents.length > 0) {
      return res.status(400).json({ error: 'Cannot delete student with existing incidents' });
    }

    await runQuery('DELETE FROM students WHERE id = ?', [req.params.id]);
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;