const mysql = require('mysql2/promise');

// Create database connection pool
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'student_disciplinary_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool;

async function initializeDatabase() {
  try {
    pool = mysql.createPool(dbConfig);

    // Test the connection
    const connection = await pool.getConnection();
    console.log('Connected to MySQL database');

    // Check if tables exist and create default data if needed
    await ensureDefaultData();

    connection.release();
  } catch (error) {
    console.error('Error connecting to MySQL database:', error.message);
    console.error('Please ensure:');
    console.error('1. XAMPP MySQL server is running');
    console.error('2. Database "student_disciplinary_db" exists');
    console.error('3. Database credentials are correct in .env file');
    process.exit(1);
  }
}

// Ensure default data exists
async function ensureDefaultData() {
  try {
    // Add new columns to users table if they don't exist
    try {
      await pool.execute('ALTER TABLE users ADD COLUMN full_name VARCHAR(100)');
      console.log('Added full_name column to users table');
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await pool.execute('ALTER TABLE users ADD COLUMN department VARCHAR(100)');
      console.log('Added department column to users table');
    } catch (error) {
      // Column might already exist, ignore error
    }

    // Update role enum to include Super Admin, Admin, Faculty Staff, Student
    try {
      await pool.execute("ALTER TABLE users MODIFY COLUMN role ENUM('Super Admin','Admin','Faculty Staff','Student')");
      console.log('Updated role enum to include Super Admin, Admin, Faculty Staff, Student');
    } catch (error) {
      // Enum might already be updated, ignore error
    }

    // Add status column to users table for approval workflow
    try {
      await pool.execute("ALTER TABLE users ADD COLUMN status ENUM('pending','approved','rejected','suspended') DEFAULT 'approved'");
      console.log('Added status column to users table');
    } catch (error) {
      // Column might already exist, ignore error
    }

    // Update existing users to approved status
    try {
      await pool.execute("UPDATE users SET status = 'approved' WHERE status IS NULL OR status = ''");
      console.log('Updated existing users to approved status');
    } catch (error) {
      // Might fail if no users or column issues, ignore
    }

    // Add contact_number column to students table if it doesn't exist
    try {
      await pool.execute('ALTER TABLE students ADD COLUMN contact_number VARCHAR(20)');
      console.log('Added contact_number column to students table');
    } catch (error) {
      // Column might already exist, ignore error
    }

    // Drop student_id_number column if it exists (no longer needed)
    try {
      await pool.execute('ALTER TABLE students DROP COLUMN student_id_number');
      console.log('Dropped student_id_number column from students table');
    } catch (error) {
      // Column might not exist, ignore error
    }

    // Check if old admin email exists and update to new one
    const [oldAdminRows] = await pool.execute(
      'SELECT user_id FROM users WHERE email = ?',
      ['admin@school.edu']
    );

    if (oldAdminRows.length > 0) {
      await pool.execute(
        "UPDATE users SET email = 'admin@acts.edu', role = 'Super Admin', status = 'approved' WHERE email = ?",
        ['admin@school.edu']
      );
      console.log('Updated old admin email from admin@school.edu to admin@acts.edu');
    }

    // Check if default admin exists
    const [adminRows] = await pool.execute(
      'SELECT user_id FROM users WHERE email = ?',
      ['admin@acts.edu']
    );

    if (adminRows.length === 0) {
      const bcrypt = require('bcryptjs');
      const defaultPassword = 'admin123';
      const saltRounds = 10;

      const hash = await bcrypt.hash(defaultPassword, saltRounds);

      await pool.execute(
        'INSERT INTO users (password, role, email, full_name, status) VALUES (?, ?, ?, ?, ?)',
        [hash, 'Super Admin', 'admin@acts.edu', 'System Administrator', 'approved']
      );

      console.log('Default admin created: email=admin@acts.edu, password=admin123');
    } else {
      // Update existing admin to Super Admin role and approved status
      await pool.execute(
        "UPDATE users SET role = 'Super Admin', status = 'approved' WHERE email = ?",
        ['admin@acts.edu']
      );
      console.log('Updated existing admin to Super Admin role and approved status');
    }

    // Check if default violation exists
    const [violationRows] = await pool.execute(
      'SELECT violation_id FROM violations WHERE violation_name = ?',
      ['Late Attendance']
    );

    if (violationRows.length === 0) {
      await pool.execute(
        'INSERT INTO violations (violation_name, category, severity_level, description) VALUES (?, ?, ?, ?)',
        ['Late Attendance', 'Attendance', 'Minor', 'Student arrived late to class']
      );

      console.log('Default violation added');
    }

  } catch (error) {
    console.error('Error ensuring default data:', error.message);
  }
}

// Helper function to execute queries
async function executeQuery(sql, params = []) {
  try {
    const [rows, fields] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Helper function to get single row
async function getRow(sql, params = []) {
  const rows = await executeQuery(sql, params);
  return rows[0] || null;
}

// Helper function to get all rows
async function getAllRows(sql, params = []) {
  return await executeQuery(sql, params);
}

// Helper function to run insert/update/delete queries
async function runQuery(sql, params = []) {
  const result = await executeQuery(sql, params);
  return {
    insertId: result.insertId,
    affectedRows: result.affectedRows
  };
}

module.exports = {
  initializeDatabase,
  executeQuery,
  getRow,
  getAllRows,
  runQuery
};