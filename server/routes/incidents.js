const express = require('express');
const { runQuery, getRow, getAllRows } = require('../database/db');
const { verifyToken } = require('./auth');

const router = express.Router();

// Get student offense count and history
router.get('/student/:studentId/offense-count', verifyToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { violationId } = req.query;
    
    // If violationId is provided, count only that specific offense
    if (violationId) {
      const offenseCount = await getRow(
        `SELECT COUNT(*) as count FROM disciplinary_cases WHERE student_id = ? AND violation_id = ?`,
        [studentId, violationId]
      );
      
      // Get previous incidents of the same type
      const previousIncidents = await getAllRows(
        `SELECT dc.case_id, dc.date_reported, v.violation_name, v.category, dc.case_status
         FROM disciplinary_cases dc
         JOIN violations v ON dc.violation_id = v.violation_id
         WHERE dc.student_id = ? AND dc.violation_id = ?
         ORDER BY dc.date_reported DESC`,
        [studentId, violationId]
      );
      
      return res.json({
        offenseCount: offenseCount?.count || 0,
        previousIncidents: previousIncidents || []
      });
    }
    
    // Otherwise, get total count and breakdown
    const totalCount = await getRow(
      `SELECT COUNT(*) as total FROM disciplinary_cases WHERE student_id = ?`,
      [studentId]
    );
    
    // Get offense count by category
    const categoryCount = await getAllRows(
      `SELECT v.category, COUNT(*) as count 
       FROM disciplinary_cases dc 
       JOIN violations v ON dc.violation_id = v.violation_id 
       WHERE dc.student_id = ? 
       GROUP BY v.category`,
      [studentId]
    );
    
    // Get recent incidents (last 5)
    const recentIncidents = await getAllRows(
      `SELECT dc.case_id, dc.date_reported, v.violation_name, v.category, dc.case_status
       FROM disciplinary_cases dc
       JOIN violations v ON dc.violation_id = v.violation_id
       WHERE dc.student_id = ?
       ORDER BY dc.date_reported DESC
       LIMIT 5`,
      [studentId]
    );
    
    res.json({
      totalOffenseCount: totalCount?.total || 0,
      categoryCount: categoryCount || [],
      recentIncidents: recentIncidents || []
    });
  } catch (error) {
    console.error('Error fetching student offense count:', error);
    res.status(500).json({ error: 'Failed to fetch student offense count' });
  }
});

// Get all disciplinary cases
router.get('/', verifyToken, async (req, res) => {
  try {
    const records = await getAllRows(`
      SELECT dc.case_id as id,
             dc.student_id,
             dc.violation_id,
             dc.reported_by,
             dc.date_reported as date,
             dc.case_status as status,
             dc.action_taken,
             s.first_name,
             s.last_name,
             s.course as grade,
             s.year_level,
             v.violation_name as type,
             v.category as severity,
             v.description,
             u.full_name as reportedByName
      FROM disciplinary_cases dc
      LEFT JOIN students s ON dc.student_id = s.student_id
      LEFT JOIN violations v ON dc.violation_id = v.violation_id
      LEFT JOIN users u ON dc.reported_by = u.user_id
      ORDER BY dc.date_reported DESC
    `);

    // Transform to match frontend expectations
    const transformedRecords = records.map(record => ({
      id: record.id.toString(),
      studentId: record.student_id.toString(),
      violationId: record.violation_id ? record.violation_id.toString() : null,
      studentName: `${record.first_name} ${record.last_name}`,
      grade: record.grade || '',
      class: record.year_level ? `Year ${record.year_level}` : '',
      type: record.type,
      severity: record.severity,
      description: record.description,
      actionTaken: record.action_taken || '',
      status: record.status || 'Pending',
      reportedBy: record.reportedByName || 'Unknown',
      date: record.date,
      communicationLogs: []
    }));

    res.json(transformedRecords);
  } catch (error) {
    console.error('Error fetching disciplinary cases:', error);
    res.status(500).json({ error: 'Failed to fetch disciplinary cases' });
  }
});

// Get single disciplinary case by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid case ID' });
    }

    const record = await getRow(`
      SELECT dc.case_id as id,
             dc.student_id,
             dc.violation_id,
             dc.reported_by,
             dc.date_reported as date,
             dc.case_status as status,
             dc.action_taken,
             s.first_name,
             s.last_name,
             s.course as grade,
             s.year_level,
             v.violation_name as type,
             v.category as severity,
             v.description,
             u.full_name as reportedByName
      FROM disciplinary_cases dc
      LEFT JOIN students s ON dc.student_id = s.student_id
      LEFT JOIN violations v ON dc.violation_id = v.violation_id
      LEFT JOIN users u ON dc.reported_by = u.user_id
      WHERE dc.case_id = ?
    `, [id]);

    if (!record) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const transformedRecord = {
      id: record.id.toString(),
      studentId: record.student_id.toString(),
      studentName: `${record.first_name} ${record.last_name}`,
      grade: record.grade || '',
      class: record.year_level ? `Year ${record.year_level}` : '',
      type: record.type,
      severity: record.severity,
      description: record.description,
      actionTaken: record.action_taken || '',
      status: record.status || 'Pending',
      reportedBy: record.reportedByName || 'Unknown',
      date: record.date,
      communicationLogs: []
    };

    res.json(transformedRecord);
  } catch (error) {
    console.error('Error fetching disciplinary case:', error);
    res.status(500).json({ error: 'Failed to fetch disciplinary case' });
  }
});

// Create new disciplinary case
router.post('/', verifyToken, async (req, res) => {
  const { studentId, type, severity, date, description, actionTaken, status, reportedBy } = req.body;

  if (!studentId || !type || !date || !reportedBy) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Find violation by name
    let violation = await getRow('SELECT violation_id as id FROM violations WHERE violation_name = ?', [type]);
    if (!violation) {
      // Auto-create the violation if it doesn't exist
      const defaultCategory = severity || 'Category 1 Offense';
      const insertResult = await runQuery(
        'INSERT INTO violations (violation_name, category, description) VALUES (?, ?, ?)',
        [type, defaultCategory, description || 'Auto-created from incident submission']
      );
      violation = { id: insertResult.insertId };
    }

    // Get the current user ID from the token
    const reportedById = req.user?.id || null;

    if (!reportedById) {
      return res.status(400).json({ error: 'Unable to identify the reporting user' });
    }

    const result = await runQuery(
      'INSERT INTO disciplinary_cases (student_id, violation_id, reported_by, date_reported, case_status) VALUES (?, ?, ?, ?, ?)',
      [studentId, violation.id, reportedById, date, status || 'Pending']
    );

    // Get the created record with joined data
    const newRecord = await getRow(`
      SELECT dc.case_id as id,
             dc.student_id,
             dc.violation_id,
             dc.reported_by,
             dc.date_reported as date,
             dc.case_status as status,
             s.first_name,
             s.last_name,
             s.course as grade,
             s.year_level,
             v.violation_name as type,
             v.category as severity,
             v.description,
             u.full_name as reportedByName
      FROM disciplinary_cases dc
      LEFT JOIN students s ON dc.student_id = s.student_id
      LEFT JOIN violations v ON dc.violation_id = v.violation_id
      LEFT JOIN users u ON dc.reported_by = u.user_id
      WHERE dc.case_id = ?
    `, [result.insertId]);

    // Transform response
    const transformedRecord = {
      id: newRecord.id.toString(),
      studentId: newRecord.student_id.toString(),
      studentName: `${newRecord.first_name} ${newRecord.last_name}`,
      grade: newRecord.grade || '',
      class: newRecord.year_level ? `Year ${newRecord.year_level}` : '',
      type: newRecord.type,
      severity: newRecord.severity,
      description: newRecord.description,
      actionTaken: newRecord.action_taken || '',
      status: newRecord.status || 'Pending',
      reportedBy: newRecord.reportedByName || 'Unknown',
      date: newRecord.date,
      communicationLogs: []
    };

    res.status(201).json(transformedRecord);
  } catch (error) {
    console.error('Error creating disciplinary case:', error);
    res.status(500).json({ error: 'Failed to create disciplinary case' });
  }
});

// Update disciplinary case
router.put('/:id', verifyToken, async (req, res) => {
  const { studentId, type, severity, date, description, status, reportedBy, actionTaken, sanction } = req.body;
  const id = parseInt(req.params.id);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid case ID' });
  }

  try {
    // First get the current case to find violation_id
    const currentCase = await getRow('SELECT violation_id, student_id, reported_by, action_taken FROM disciplinary_cases WHERE case_id = ?', [id]);
    
    if (!currentCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Find or create violation - use current violation if type is not provided
    let violation;
    if (type) {
      violation = await getRow('SELECT violation_id as id FROM violations WHERE violation_name = ?', [type]);
      if (!violation) {
        const defaultCategory = severity || 'Category 1 Offense';
        const insertResult = await runQuery(
          'INSERT INTO violations (violation_name, category, description) VALUES (?, ?, ?)',
          [type, defaultCategory, description || 'Auto-created from incident update']
        );
        violation = { id: insertResult.insertId };
      }
    } else {
      // Use the existing violation_id from current case
      violation = { id: currentCase.violation_id };
    }

    const reportedById = reportedBy || req.user?.id;
    
    // If reportedBy is a string (name), try to look up the user_id
    let reportedByIdNum;
    if (reportedById) {
      const parsedId = parseInt(reportedById);
      if (!isNaN(parsedId)) {
        // It's a numeric user_id
        reportedByIdNum = parsedId;
      } else {
        // It's likely a name string, try to look up the user
        const user = await getRow('SELECT user_id FROM users WHERE full_name = ?', [reportedById]);
        reportedByIdNum = user ? user.user_id : (currentCase.reported_by || null);
      }
    } else {
      reportedByIdNum = currentCase.reported_by || null;
    }
    
    // Ensure all values are properly handled (convert undefined to null)
    const finalReportedBy = reportedByIdNum !== undefined ? reportedByIdNum : null;
    
    // Use the existing values from the current case if no new values are provided
    const studentIdNum = studentId ? parseInt(studentId) : (currentCase.student_id || null);
    const finalStudentId = studentIdNum !== undefined ? studentIdNum : null;
    const dateValue = date || currentCase.date_reported || null;
    const finalStatus = status || currentCase.case_status || 'Pending';
    
    // Use actionTaken or sanction, or keep existing action_taken
    const actionTakenValue = actionTaken || sanction || currentCase.action_taken || '';
    
    const result = await runQuery(
      'UPDATE disciplinary_cases SET student_id = ?, violation_id = ?, reported_by = ?, date_reported = ?, case_status = ?, action_taken = ? WHERE case_id = ?',
      [finalStudentId, violation.id, finalReportedBy, dateValue, finalStatus, actionTakenValue, id]
    );

    // If status is Resolved, also add the record to disciplinary_records
    if (status === 'Resolved') {
      try {
        // Check if a record already exists for this case
        let existingRecord = await getRow(
          'SELECT record_id FROM disciplinary_records WHERE student_id = ? AND violation_id = ? AND date_reported = ?',
          [finalStudentId, violation.id, dateValue]
        );
        
        let recordId;
        if (!existingRecord) {
          // Create a new disciplinary record
          const insertResult = await runQuery(
            'INSERT INTO disciplinary_records (student_id, violation_id, reported_by, date_reported, status) VALUES (?, ?, ?, ?, ?)',
            [finalStudentId, violation.id, finalReportedBy, dateValue, 'Resolved']
          );
          recordId = insertResult.insertId;
        } else {
          // Update existing record status to Resolved
          await runQuery(
            'UPDATE disciplinary_records SET status = ? WHERE record_id = ?',
            ['Resolved', existingRecord.record_id]
          );
          recordId = existingRecord.record_id;
        }
        
        // If sanction is provided, save it to the sanctions table
        if (sanction && sanction.trim()) {
          await runQuery(
            'INSERT INTO sanctions (record_id, sanction_type, description) VALUES (?, ?, ?)',
            [recordId, sanction.trim(), `Sanction assigned for resolved incident`]
          );
        }
      } catch (e) {
        // Ignore errors in disciplinary_records sync
        console.error('Error syncing to disciplinary_records:', e);
      }
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Get the updated record with joined data
    const updatedRecord = await getRow(`
      SELECT dc.case_id as id,
             dc.student_id,
             dc.violation_id,
             dc.reported_by,
             dc.date_reported as date,
             dc.case_status as status,
             s.first_name,
             s.last_name,
             s.course as grade,
             s.year_level,
             v.violation_name as type,
             v.category as severity,
             v.description,
             u.full_name as reportedByName
      FROM disciplinary_cases dc
      LEFT JOIN students s ON dc.student_id = s.student_id
      LEFT JOIN violations v ON dc.violation_id = v.violation_id
      LEFT JOIN users u ON dc.reported_by = u.user_id
      WHERE dc.case_id = ?
    `, [req.params.id]);

    // Transform response
    const transformedRecord = {
      id: updatedRecord.id.toString(),
      studentId: updatedRecord.student_id.toString(),
      studentName: `${updatedRecord.first_name} ${updatedRecord.last_name}`,
      grade: updatedRecord.grade || '',
      class: updatedRecord.year_level ? `Year ${updatedRecord.year_level}` : '',
      type: updatedRecord.type,
      severity: updatedRecord.severity,
      description: updatedRecord.description,
      actionTaken: '',
      status: updatedRecord.status || 'Pending',
      reportedBy: updatedRecord.reportedByName || 'Unknown',
      date: updatedRecord.date,
      communicationLogs: []
    };

    res.json(transformedRecord);
  } catch (error) {
    console.error('Error updating disciplinary case:', error);
    res.status(500).json({ error: 'Failed to update disciplinary case' });
  }
});

// Delete disciplinary case
router.delete('/:id', verifyToken, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid case ID' });
  }

  try {
    const result = await runQuery('DELETE FROM disciplinary_cases WHERE case_id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.json({ message: 'Case deleted successfully' });
  } catch (error) {
    console.error('Error deleting disciplinary case:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get violations list
router.get('/violations/list', verifyToken, async (req, res) => {
  try {
    const violations = await getAllRows('SELECT violation_id as id, violation_name as name, category as severity, description FROM violations ORDER BY violation_name');
    res.json(violations);
  } catch (error) {
    console.error('Error fetching violations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// AI-powered sanction suggestion using Gemini
router.post('/suggest-sanction', verifyToken, async (req, res) => {
  try {
    const { offenseCategory, offenseCount, studentHistory, violationName, violationDescription } = req.body;
    
    if (!offenseCategory || offenseCount === undefined) {
      return res.status(400).json({ error: 'Missing required fields: offenseCategory and offenseCount' });
    }
    
    // Predefined handbook rules for sanctions
    const handbookRules = {
      "Category 1": {
        firstOffense: "Written Warning",
        secondOffense: "1-Day Suspension",
        thirdOffense: "3-Day Suspension",
        fourthOffense: "5-Day Suspension with Parent Conference",
        default: "Written Warning"
      },
      "Category 2": {
        firstOffense: "1-Day Suspension",
        secondOffense: "3-Day Suspension",
        thirdOffense: "5-Day Suspension",
        fourthOffense: "Long-term Suspension (7+ days)",
        default: "1-Day Suspension"
      },
      "Category 3": {
        firstOffense: "3-Day Suspension",
        secondOffense: "5-Day Suspension",
        thirdOffense: "Long-term Suspension (10+ days)",
        fourthOffense: "Expulsion Recommendation",
        default: "3-Day Suspension"
      }
    };
    
    // Map category from full name to key
    const categoryMap = {
      "Category 1 Offense": "Category 1",
      "Category 2 Offense": "Category 2",
      "Category 3 Offense": "Category 3"
    };
    
    const categoryKey = categoryMap[offenseCategory] || offenseCategory;
    const rules = handbookRules[categoryKey] || handbookRules["Category 1"];
    
    // Determine sanction based on offense count
    let suggestedSanction;
    let explanation;
    
    if (offenseCount === 0 || offenseCount === 1) {
      suggestedSanction = rules.firstOffense;
      explanation = `First offense for ${categoryKey} violation. Standard protocol requires a ${suggestedSanction}.`;
    } else if (offenseCount === 2) {
      suggestedSanction = rules.secondOffense;
      explanation = `Second offense of this type. Based on the student handbook, repeat offenders receive a ${suggestedSanction}.`;
    } else if (offenseCount === 3) {
      suggestedSanction = rules.thirdOffense;
      explanation = `Third offense indicates persistent behavior. The handbook mandates ${suggestedSanction}.`;
    } else {
      suggestedSanction = rules.fourthOffense;
      explanation = `Multiple repeat offenses (${offenseCount} incidents). This escalated response is required per handbook guidelines.`;
    }
    
    // Check for additional factors in student history
    let additionalNotes = [];
    if (studentHistory && studentHistory.length > 0) {
      const totalPreviousIncidents = studentHistory.length;
      if (totalPreviousIncidents >= 5) {
        additionalNotes.push("⚠️ Student has extensive disciplinary history (5+ total incidents). Consider mandatory counseling.");
      }
      if (totalPreviousIncidents >= 3) {
        additionalNotes.push("⚠️ Multiple different violations on record. Parent conference strongly recommended.");
      }
      
      // Check for recent incidents (within last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentIncidents = studentHistory.filter(h => new Date(h.date_reported) > thirtyDaysAgo);
      if (recentIncidents.length >= 2) {
        additionalNotes.push("⚠️ Multiple recent incidents within 30 days. Consider escalating to prevent further violations.");
      }
    }
    
    // Use Gemini for AI enhancement if API key is available
    const geminiApiKey = process.env.GEMINI_API_KEY;
    
    if (geminiApiKey && geminiApiKey.startsWith('AIza')) {
      try {
        const geminiPrompt = `You are a school disciplinary advisor. Based on the following case information, provide a brief additional recommendation (1-2 sentences) for the sanction:

- Violation: ${violationName || 'Unknown'}
- Category: ${offenseCategory}
- Description: ${violationDescription || 'Not provided'}
- Previous offense count for this type: ${offenseCount}
- Total previous incidents: ${studentHistory?.length || 0}

Keep your response concise and focused on rehabilitation and prevention.`;
        
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: geminiPrompt }] }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 200
              }
            })
          }
        );
        
        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          const aiRecommendation = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (aiRecommendation) {
            additionalNotes.push(`🤖 AI Insight: ${aiRecommendation}`);
          }
        }
      } catch (aiError) {
        console.error('Gemini API error:', aiError);
        // Continue with rule-based suggestion even if AI fails
      }
    }
    
    res.json({
      suggestedSanction,
      explanation,
      category: categoryKey,
      offenseCount,
      additionalNotes: additionalNotes.length > 0 ? additionalNotes : null,
      basedOn: "ACTS Student Handbook 2025-2026"
    });
  } catch (error) {
    console.error('Error generating sanction suggestion:', error);
    res.status(500).json({ error: 'Failed to generate sanction suggestion' });
  }
});

module.exports = router;
