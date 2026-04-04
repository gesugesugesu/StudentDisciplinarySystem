const express = require('express');
const { getAllRows, getRow, runQuery } = require('../database/db');

const router = express.Router();

// Get all courses
router.get('/', async (req, res) => {
  try {
    const courses = await getAllRows('SELECT course_id, course_name, created_at FROM courses ORDER BY course_name');
    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a new course
router.post('/', async (req, res) => {
  try {
    const { course_name } = req.body;

    if (!course_name) {
      return res.status(400).json({ error: 'Course name is required' });
    }

    // Check if course already exists
    const existingCourse = await getRow('SELECT course_id FROM courses WHERE course_name = ?', [course_name]);
    
    if (existingCourse) {
      return res.status(400).json({ error: 'Course already exists' });
    }

    const result = await runQuery('INSERT INTO courses (course_name) VALUES (?)', [course_name]);

    const newCourse = await getRow('SELECT course_id, course_name, created_at FROM courses WHERE course_id = ?', [result.insertId]);

    res.status(201).json({
      message: 'Course added successfully',
      course: newCourse
    });
  } catch (error) {
    console.error('Error adding course:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a course
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await runQuery('DELETE FROM courses WHERE course_id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;