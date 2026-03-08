const express = require('express');
const { runQuery, getRow, getAllRows } = require('../database/db');
const { verifyToken } = require('./auth');

const router = express.Router();

// Get all sanction types
router.get('/types', verifyToken, async (req, res) => {
  try {
    // First check if sanction_types table exists, if not create it
    try {
      await runQuery(`
        CREATE TABLE IF NOT EXISTS sanction_types (
          sanction_type_id INT AUTO_INCREMENT PRIMARY KEY,
          sanction_name VARCHAR(100) NOT NULL,
          category VARCHAR(50) NOT NULL
        )
      `);
      
      // Check if table is empty, if so insert default values
      const count = await getRow('SELECT COUNT(*) as count FROM sanction_types');
      if (count.count === 0) {
        await runQuery(`INSERT INTO sanction_types (sanction_name, category) VALUES ('Verbal Warning', 'Category 1')`);
        await runQuery(`INSERT INTO sanction_types (sanction_name, category) VALUES ('Written Warning', 'Category 1')`);
        await runQuery(`INSERT INTO sanction_types (sanction_name, category) VALUES ('Counseling', 'Category 1')`);
        await runQuery(`INSERT INTO sanction_types (sanction_name, category) VALUES ('Parent Conference', 'Category 1')`);
        await runQuery(`INSERT INTO sanction_types (sanction_name, category) VALUES ('Community Service', 'Category 1')`);
        await runQuery(`INSERT INTO sanction_types (sanction_name, category) VALUES ('Detention', 'Category 1')`);
        await runQuery(`INSERT INTO sanction_types (sanction_name, category) VALUES ('Suspension', 'Category 2')`);
        await runQuery(`INSERT INTO sanction_types (sanction_name, category) VALUES ('Restriction', 'Category 2')`);
        await runQuery(`INSERT INTO sanction_types (sanction_name, category) VALUES ('Restitution', 'Category 2')`);
        await runQuery(`INSERT INTO sanction_types (sanction_name, category) VALUES ('Expulsion', 'Category 3')`);
      }
    } catch (e) {
      // Table may already exist, continue
    }
    
    const sanctionTypes = await getAllRows('SELECT * FROM sanction_types ORDER BY sanction_type_id');
    res.json(sanctionTypes);
  } catch (error) {
    console.error('Error fetching sanction types:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get sanction types by category
router.get('/types/:category', verifyToken, async (req, res) => {
  try {
    const { category } = req.params;
    const sanctionTypes = await getAllRows(
      'SELECT * FROM sanction_types WHERE category = ? ORDER BY sanction_type_id',
      [category]
    );
    res.json(sanctionTypes);
  } catch (error) {
    console.error('Error fetching sanction types:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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