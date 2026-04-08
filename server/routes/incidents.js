const express = require('express');
const fs = require('fs');
const path = require('path');
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

    if (!currentCase.student_id) {
      return res.status(400).json({ error: 'Case has no student assigned' });
    }

    if (!currentCase.violation_id) {
      return res.status(400).json({ error: 'Case has no violation assigned' });
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

    // Handle reportedBy - should be a user ID, fallback to current user or existing value
    let finalReportedBy = currentCase.reported_by; // Keep existing by default

    if (reportedBy) {
      const parsedId = parseInt(reportedBy);
      if (!isNaN(parsedId) && parsedId > 0) {
        // Valid user ID provided
        finalReportedBy = parsedId;
      } else {
        console.warn(`Invalid reportedBy value: ${reportedBy}, keeping existing value`);
      }
    } else if (req.user?.id) {
      // No reportedBy provided, use current user
      finalReportedBy = req.user.id;
    }
    
// Use the existing values from the current case if no new values are provided
const studentIdNum = studentId ? parseInt(studentId) : (currentCase.student_id || null);
const finalStudentId = studentIdNum !== undefined ? studentIdNum : null;
let dateValue = date || currentCase.date_reported;
if (!dateValue) {
  dateValue = new Date().toISOString().split('T')[0];
}
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
      actionTaken: updatedRecord.action_taken || '',
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
router.post('/suggest-sanction', async (req, res) => {
  let suggestedSanction = "Written Warning";
  let explanation = "Basic disciplinary measure applied.";
  let additionalNotes = [];
  let aiUsedSuccessfully = false;
  let offenseCategory = req.body.offenseCategory;
  let offenseCount = req.body.offenseCount;
  let studentHistory = req.body.studentHistory;
  let violationName = req.body.violationName;
  let violationDescription = req.body.violationDescription;

  try {
    console.log('AI Suggestion requested:', { offenseCategory, offenseCount, violationName });

    if (!offenseCategory || offenseCount === undefined) {
      return res.status(400).json({ error: 'Missing required fields: offenseCategory and offenseCount' });
    }
    
    // Initialize with category-based fallback values (used if Gemini completely fails)
    suggestedSanction = "Written Warning";
    explanation = "Basic disciplinary measure applied.";
    additionalNotes = [];

    // Provide varied fallback sanctions based on category and offense count
    if (offenseCategory === "Category 1 Offense") {
      if (offenseCount === 0) {
        suggestedSanction = "Verbal Warning";
        explanation = "First offense in Category 1. Verbal warning issued with documentation.";
      } else if (offenseCount === 1) {
        suggestedSanction = "Written Warning";
        explanation = "Second Category 1 offense. Written warning with parent notification required.";
      } else {
        suggestedSanction = "Detention (1 day)";
        explanation = "Multiple Category 1 offenses. Detention imposed to reinforce expectations.";
      }
    } else if (offenseCategory === "Category 2 Offense") {
      if (offenseCount === 0) {
        suggestedSanction = "Written Warning + Parent Conference";
        explanation = "Category 2 offense requires written warning and mandatory parent conference.";
      } else {
        suggestedSanction = "Suspension (1-3 days)";
        explanation = "Repeat Category 2 offense. Suspension recommended with review of behavior contract.";
      }
    } else if (offenseCategory === "Category 3 Offense") {
      suggestedSanction = "Suspension (3-5 days) + Counseling";
      explanation = "Category 3 offense requires suspension and mandatory counseling assessment.";
    }

    // Check for additional factors in student history
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
    
    // Use Gemini AI as PRIMARY sanction recommendation engine with PDF handbook access
    const geminiApiKey = process.env.GEMINI_API_KEY;
    console.log('Gemini API key configured:', !!geminiApiKey, geminiApiKey ? geminiApiKey.substring(0, 10) + '...' : 'none');

    if (geminiApiKey && geminiApiKey.startsWith('AIza')) {
      try {
        // Read the PDF handbook file
        const pdfPath = path.join(process.cwd(), '..', 'frontend', 'src', 'assets', 'ACTS-STUDENT-HANDBOOK-2025-Edited.pdf');

        try {
          if (fs.existsSync(pdfPath)) {
            const pdfBuffer = fs.readFileSync(pdfPath);
            pdfBase64 = pdfBuffer.toString('base64');
            console.log('Successfully loaded ACTS Student Handbook PDF for AI analysis, size:', pdfBuffer.length, 'bytes');
          } else {
            console.warn('PDF handbook file not found at:', pdfPath);
            console.log('Current working directory:', process.cwd());
  let aiUsedSuccessfully = false;

  try {
              const assetsDir = path.join(process.cwd(), '..', 'frontend', 'src', 'assets');
              if (fs.existsSync(assetsDir)) {
                console.log('Available files in frontend/assets:', fs.readdirSync(assetsDir).join(', '));
              } else {
                console.log('Assets directory not found at:', assetsDir);
              }
            } catch (dirError) {
              console.log('Could not check assets directory:', dirError.message);
            }
            console.log('Falling back to basic disciplinary measures due to missing handbook');
          }
        } catch (fileError) {
          console.error('Could not read PDF handbook file:', fileError.message);
          console.error('File path attempted:', pdfPath);
          console.log('Falling back to basic disciplinary measures due to file error');
          // Continue with basic fallback if PDF can't be read
        }

        // Generate comprehensive case analysis for Gemini
        const caseTimestamp = new Date().toISOString();
        const uniqueContext = `Case ID: ${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const geminiPrompt = `You are the ACTS school's AI Disciplinary Officer. You MUST analyze the provided ACTS Student Handbook PDF and provide sanction recommendations that strictly follow the handbook's guidelines.

**CRITICAL REQUIREMENTS:**
- Base ALL recommendations EXCLUSIVELY on the ACTS Student Handbook PDF content
- Do NOT use any external knowledge, general school policies, or assumptions
- Each violation type should have DISTINCT sanction recommendations based on handbook specifics
- Consider offense category, repeat count, and handbook escalation procedures
- Provide specific, actionable sanctions with clear durations and conditions

**Case Details (${uniqueContext}):**
- **Timestamp:** ${caseTimestamp}
- **Violation Type:** ${violationName || 'Unspecified violation'}
- **Category:** ${offenseCategory}
- **Description:** ${violationDescription || 'No additional details'}
- **Repeat Offenses:** ${offenseCount} previous incident(s) of this exact violation type
- **Total Disciplinary History:** ${studentHistory?.length || 0} total incidents across all categories

**Student's Disciplinary Record:**
${studentHistory && studentHistory.length > 0 ?
  studentHistory.slice(0, 5).map((h, i) => `${i+1}. ${h.violation_name} - ${h.category} (${h.date_reported}) - ${h.case_status}`).join('\n') :
  'Clean disciplinary record'
}

**MANDATORY OUTPUT FORMAT - Follow Exactly:**
1. **Recommended Sanction:** [Specific sanction with exact details from handbook - include duration, conditions, appeals process]
2. **Handbook Section:** [Direct quote from the PDF showing the exact rule violated and sanction prescribed]
3. **Escalation Factors:** [How repeat offenses and category affect this recommendation per handbook guidelines]
4. **Required Actions:** [Immediate steps, parental notification, counseling requirements from handbook]
5. **Follow-up Requirements:** [Monitoring, review periods, reinstatement conditions per handbook]

**SANCTION VARIATION RULES:**
- **First Offense Category 1:** Focus on education and warning
- **Repeat Category 1:** Escalate to probation or suspension
- **Category 2 Offenses:** Require parental involvement and stricter sanctions
- **Category 3 Offenses:** Maximum sanctions with possible expulsion procedures
- **Multiple Violations:** Consider cumulative effect and handbook's progressive discipline

**REMINDER:** Your authority comes from the handbook. If the PDF content conflicts with general knowledge, the handbook takes precedence.`;

        // Prepare multimodal content with text and PDF
        const contents = [{ parts: [{ text: geminiPrompt }] }];

        if (pdfBase64) {
          contents[0].parts.push({
            inline_data: {
              mime_type: 'application/pdf',
              data: pdfBase64
            }
          });
        }

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: contents,
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 600
              }
            }),
            signal: controller.signal
          }
        );

        clearTimeout(timeoutId);

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          const aiRecommendation = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

          if (aiRecommendation) {
            console.log('Gemini AI provided handbook-based sanction recommendation');
            aiUsedSuccessfully = true;

            // Parse Gemini response to extract sanction and explanation
            // Look for "Recommended Sanction:" in the response
            const sanctionMatch = aiRecommendation.match(/Recommended Sanction:\s*([^\n]+)/i);
            if (sanctionMatch) {
              suggestedSanction = sanctionMatch[1].trim();
            }

            // Extract handbook section reference
            const handbookMatch = aiRecommendation.match(/Handbook Section:\s*([^\n]+)/i);
            let handbookReference = "";
            if (handbookMatch) {
              handbookReference = handbookMatch[1].trim();
            }

            // Format the explanation to include handbook reference
            if (handbookReference) {
              explanation = `${aiRecommendation}\n\n📖 **Handbook Reference:** ${handbookReference}`;
            } else {
              explanation = aiRecommendation;
            }

            // Add any additional notes from history checking to the AI response
            if (additionalNotes.length > 0) {
              explanation += '\n\nAdditional Considerations:\n' + additionalNotes.join('\n');
            }

            // Clear additionalNotes since they're now included in explanation
            additionalNotes = [];
          } else {
            console.warn('Gemini API returned empty response, using fallback');
          }
        } else {
          const errorText = await geminiResponse.text();
          console.error('Gemini API error:', geminiResponse.status, errorText);
        }
      } catch (aiError) {
        if (aiError.name === 'AbortError') {
          console.error('Gemini AI request timed out');
        } else {
          console.error('Gemini AI processing error:', aiError.message);
        }
        console.log('Falling back to category-based disciplinary measures due to AI failure');
        // Continue with basic fallback values already set
      }
    } else {
      console.log('Gemini API key not configured, using basic disciplinary measures');
    }
    
    res.json({
      suggestedSanction,
      explanation,
      category: offenseCategory,
      offenseCount,
      additionalNotes: additionalNotes.length > 0 ? additionalNotes : null,
      basedOn: aiUsedSuccessfully ? "ACTS Student Handbook 2025-2026 (AI analyzed)" : "ACTS Student Handbook 2025-2026 (fallback recommendations)",
      aiUsed: aiUsedSuccessfully
    });
  } catch (error) {
    console.error('Error generating sanction suggestion:', error);
    res.status(200).json({
      suggestedSanction,
      explanation,
      category: offenseCategory,
      offenseCount,
      additionalNotes: additionalNotes.length > 0 ? additionalNotes : null,
      basedOn: aiUsedSuccessfully ? "ACTS Student Handbook 2025-2026 (AI analyzed)" : "ACTS Student Handbook 2025-2026 (fallback recommendations)",
      aiUsed: !!pdfBase64
    });
  }
});

module.exports = router;
