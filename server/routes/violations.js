const express = require('express');
const { getAllRows, runQuery, getRow } = require('../database/db');

const router = express.Router();

// Get all violations
router.get('/', async (req, res) => {
  try {
    const violations = await getAllRows('SELECT violation_id as id, violation_name as name, category as severity, description FROM violations ORDER BY violation_name ASC');
    res.json(violations);
  } catch (err) {
    console.error('Error fetching violations:', err);
    return res.status(500).json({ error: 'Failed to fetch violations' });
  }
});

// Get single violation by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const violation = await getRow('SELECT violation_id as id, violation_name as name, category as severity, description FROM violations WHERE violation_id = ?', [id]);
    if (!violation) {
      return res.status(404).json({ error: 'Violation not found' });
    }
    res.json(violation);
  } catch (err) {
    console.error('Error fetching violation:', err);
    return res.status(500).json({ error: 'Failed to fetch violation' });
  }
});

// Create new violation
router.post('/', async (req, res) => {
  const { name, category, severity, description } = req.body;
  
  if (!name || !severity) {
    return res.status(400).json({ error: 'Name and severity are required' });
  }
  
  try {
    const result = await runQuery(
      'INSERT INTO violations (violation_name, category, description) VALUES (?, ?, ?)',
      [name, severity, description || null]
    );
    res.status(201).json({
      id: result.insertId,
      name,
      category: severity,
      severity,
      description
    });
  } catch (err) {
    console.error('Error creating violation:', err);
    return res.status(500).json({ error: 'Failed to create violation' });
  }
});

// Update violation
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, category, severity, description } = req.body;
  
  try {
    const result = await runQuery(
      'UPDATE violations SET violation_name = ?, category = ?, description = ? WHERE violation_id = ?',
      [name, severity, description, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Violation not found' });
    }
    res.json({ message: 'Violation updated successfully' });
  } catch (err) {
    console.error('Error updating violation:', err);
    return res.status(500).json({ error: 'Failed to update violation' });
  }
});

// Delete violation
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if there are related incidents
    const relatedCases = await getRow('SELECT case_id FROM disciplinary_cases WHERE violation_id = ?', [id]);
    const relatedRecords = await getRow('SELECT record_id FROM disciplinary_records WHERE violation_id = ?', [id]);
    
    if (relatedCases || relatedRecords) {
      return res.status(400).json({ error: 'Cannot delete this violation as it is linked to existing incidents' });
    }
    
    const result = await runQuery('DELETE FROM violations WHERE violation_id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Violation not found' });
    }
    res.json({ message: 'Violation deleted successfully' });
  } catch (err) {
    console.error('Error deleting violation:', err);
    return res.status(500).json({ error: 'Failed to delete violation' });
  }
});

module.exports = router;
