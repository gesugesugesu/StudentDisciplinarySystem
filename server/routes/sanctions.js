const express = require('express');
const { runQuery, getRow, getAllRows } = require('../database/db');
const { verifyToken } = require('./auth');

const router = express.Router();

// Get all sanctions
router.get('/', verifyToken, async (req, res) => {
  try {
    const sanctions = await getAllRows(`
      SELECT s.*,
             dr.student_id,
             st.first_name,
             st.last_name,
             v.violation_name
      FROM sanctions s
      LEFT JOIN disciplinary_records dr ON s.record_id = dr.record_id
      LEFT JOIN students st ON dr.student_id = st.student_id
      LEFT JOIN violations v ON dr.violation_id = v.violation_id
      ORDER BY s.sanction_id DESC
    `);

    res.json(sanctions);
  } catch (error) {
    console.error('Error fetching sanctions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get sanctions for a specific disciplinary record
router.get('/record/:recordId', verifyToken, async (req, res) => {
  try {
    const sanctions = await getAllRows(`
      SELECT s.*,
             dr.student_id,
             st.first_name,
             st.last_name
      FROM sanctions s
      LEFT JOIN disciplinary_records dr ON s.record_id = dr.record_id
      LEFT JOIN students st ON dr.student_id = st.student_id
      WHERE s.record_id = ?
      ORDER BY s.start_date ASC
    `, [req.params.recordId]);

    res.json(sanctions);
  } catch (error) {
    console.error('Error fetching sanctions for record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new sanction
router.post('/', verifyToken, async (req, res) => {
  try {
    const { recordId, sanctionType, description, startDate, endDate } = req.body;

    if (!recordId || !sanctionType) {
      return res.status(400).json({ error: 'Record ID and sanction type are required' });
    }

    // Check if disciplinary record exists
    const record = await getRow('SELECT record_id FROM disciplinary_records WHERE record_id = ?', [recordId]);
    if (!record) {
      return res.status(400).json({ error: 'Invalid disciplinary record ID' });
    }

    const result = await runQuery(
      'INSERT INTO sanctions (record_id, sanction_type, description, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
      [recordId, sanctionType, description || '', startDate || null, endDate || null]
    );

    const newSanction = await getRow(`
      SELECT s.*,
             dr.student_id,
             st.first_name,
             st.last_name
      FROM sanctions s
      LEFT JOIN disciplinary_records dr ON s.record_id = dr.record_id
      LEFT JOIN students st ON dr.student_id = st.student_id
      WHERE s.sanction_id = ?
    `, [result.insertId]);

    res.status(201).json(newSanction);
  } catch (error) {
    console.error('Error creating sanction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update sanction
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { sanctionType, description, startDate, endDate } = req.body;

    if (!sanctionType) {
      return res.status(400).json({ error: 'Sanction type is required' });
    }

    // Check if sanction exists
    const existingSanction = await getRow('SELECT sanction_id FROM sanctions WHERE sanction_id = ?', [req.params.id]);
    if (!existingSanction) {
      return res.status(404).json({ error: 'Sanction not found' });
    }

    await runQuery(
      'UPDATE sanctions SET sanction_type = ?, description = ?, start_date = ?, end_date = ? WHERE sanction_id = ?',
      [sanctionType, description || '', startDate || null, endDate || null, req.params.id]
    );

    const updatedSanction = await getRow(`
      SELECT s.*,
             dr.student_id,
             st.first_name,
             st.last_name
      FROM sanctions s
      LEFT JOIN disciplinary_records dr ON s.record_id = dr.record_id
      LEFT JOIN students st ON dr.student_id = st.student_id
      WHERE s.sanction_id = ?
    `, [req.params.id]);

    res.json(updatedSanction);
  } catch (error) {
    console.error('Error updating sanction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete sanction
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    // Check if sanction exists
    const sanction = await getRow('SELECT sanction_id FROM sanctions WHERE sanction_id = ?', [req.params.id]);
    if (!sanction) {
      return res.status(404).json({ error: 'Sanction not found' });
    }

    await runQuery('DELETE FROM sanctions WHERE sanction_id = ?', [req.params.id]);
    res.json({ message: 'Sanction deleted successfully' });
  } catch (error) {
    console.error('Error deleting sanction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;