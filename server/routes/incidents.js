const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { runQuery, getRow, getAllRows } = require('../database/db');
const { verifyToken } = require('./auth');

const router = express.Router();

// Get all incidents
router.get('/', verifyToken, async (req, res) => {
  try {
    const incidents = await getAllRows(`
      SELECT i.*, s.name as studentName, s.grade, s.class
      FROM incidents i
      LEFT JOIN students s ON i.studentId = s.id
      ORDER BY i.date DESC
    `);

    // Get communication logs for each incident
    for (let incident of incidents) {
      const logs = await getAllRows('SELECT * FROM communication_logs WHERE incidentId = ? ORDER BY sentAt DESC', [incident.id]);
      incident.communicationLogs = logs;
    }

    res.json(incidents);
  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get incident by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const incident = await getRow(`
      SELECT i.*, s.name as studentName, s.grade, s.class
      FROM incidents i
      LEFT JOIN students s ON i.studentId = s.id
      WHERE i.id = ?
    `, [req.params.id]);

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Get communication logs
    const logs = await getAllRows('SELECT * FROM communication_logs WHERE incidentId = ? ORDER BY sentAt DESC', [req.params.id]);
    incident.communicationLogs = logs;

    res.json(incident);
  } catch (error) {
    console.error('Error fetching incident:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new incident
router.post('/', verifyToken, async (req, res) => {
  try {
    const { studentId, type, severity, description, actionTaken, status, reportedBy, date } = req.body;

    if (!studentId || !type || !severity || !description || !reportedBy || !date) {
      return res.status(400).json({ error: 'Student ID, type, severity, description, reported by, and date are required' });
    }

    // Check if student exists
    const student = await getRow('SELECT id FROM students WHERE id = ?', [studentId]);
    if (!student) {
      return res.status(400).json({ error: 'Invalid student ID' });
    }

    const id = uuidv4();

    await runQuery(
      `INSERT INTO incidents (id, studentId, type, severity, description, actionTaken, status, reportedBy, date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, studentId, type, severity, description, actionTaken || '', status || 'Open', reportedBy, date]
    );

    const newIncident = await getRow(`
      SELECT i.*, s.name as studentName, s.grade, s.class
      FROM incidents i
      LEFT JOIN students s ON i.studentId = s.id
      WHERE i.id = ?
    `, [id]);

    res.status(201).json(newIncident);
  } catch (error) {
    console.error('Error creating incident:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update incident
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { studentId, type, severity, description, actionTaken, status, reportedBy, date } = req.body;

    if (!studentId || !type || !severity || !description || !reportedBy || !date) {
      return res.status(400).json({ error: 'Student ID, type, severity, description, reported by, and date are required' });
    }

    // Check if incident exists
    const existingIncident = await getRow('SELECT id FROM incidents WHERE id = ?', [req.params.id]);
    if (!existingIncident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Check if student exists
    const student = await getRow('SELECT id FROM students WHERE id = ?', [studentId]);
    if (!student) {
      return res.status(400).json({ error: 'Invalid student ID' });
    }

    await runQuery(
      `UPDATE incidents SET
       studentId = ?, type = ?, severity = ?, description = ?, actionTaken = ?, status = ?, reportedBy = ?, date = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [studentId, type, severity, description, actionTaken || '', status || 'Open', reportedBy, date, req.params.id]
    );

    const updatedIncident = await getRow(`
      SELECT i.*, s.name as studentName, s.grade, s.class
      FROM incidents i
      LEFT JOIN students s ON i.studentId = s.id
      WHERE i.id = ?
    `, [req.params.id]);

    res.json(updatedIncident);
  } catch (error) {
    console.error('Error updating incident:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete incident
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    // Check if incident exists
    const incident = await getRow('SELECT id FROM incidents WHERE id = ?', [req.params.id]);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Delete communication logs first
    await runQuery('DELETE FROM communication_logs WHERE incidentId = ?', [req.params.id]);

    // Delete incident
    await runQuery('DELETE FROM incidents WHERE id = ?', [req.params.id]);

    res.json({ message: 'Incident deleted successfully' });
  } catch (error) {
    console.error('Error deleting incident:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add communication log to incident
router.post('/:id/communication', verifyToken, async (req, res) => {
  try {
    const { type, recipient, subject, message } = req.body;

    if (!type || !recipient || !message) {
      return res.status(400).json({ error: 'Type, recipient, and message are required' });
    }

    // Check if incident exists
    const incident = await getRow('SELECT id FROM incidents WHERE id = ?', [req.params.id]);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const id = uuidv4();

    await runQuery(
      `INSERT INTO communication_logs (id, incidentId, type, recipient, subject, message, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, req.params.id, type, recipient, subject || '', message, 'Sent']
    );

    const newLog = await getRow('SELECT * FROM communication_logs WHERE id = ?', [id]);
    res.status(201).json(newLog);
  } catch (error) {
    console.error('Error adding communication log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get communication logs for incident
router.get('/:id/communication', verifyToken, async (req, res) => {
  try {
    // Check if incident exists
    const incident = await getRow('SELECT id FROM incidents WHERE id = ?', [req.params.id]);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const logs = await getAllRows('SELECT * FROM communication_logs WHERE incidentId = ? ORDER BY sentAt DESC', [req.params.id]);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching communication logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;