const express = require('express');
const { getAllRows } = require('../database/db');

const router = express.Router();

// Get all sanction types
router.get('/types', async (req, res) => {
  try {
    const sanctionTypes = await getAllRows('SELECT * FROM sanction_types ORDER BY sanction_type_id');
    res.json(sanctionTypes);
  } catch (error) {
    console.error('Error fetching sanction types:', error);
    res.status(500).json({ error: 'Failed to fetch sanction types' });
  }
});

module.exports = router;
