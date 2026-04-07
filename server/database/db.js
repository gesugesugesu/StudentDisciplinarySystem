const mysql = require('mysql2/promise');

// Parse Railway DATABASE_URL or use individual env vars
let dbConfig;

if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  dbConfig = {
    host: url.hostname,
    port: url.port || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1), // Remove leading slash
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
} else {
  dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dmanage',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
}

let pool;

async function initializeDatabase() {
  try {
    // First connect without database to create it if needed
    const tempConfig = { ...dbConfig, database: undefined };
    pool = mysql.createPool(tempConfig);
    
    const connection = await pool.getConnection();
    console.log('Connected to MySQL server');
    
    // Create database if it doesn't exist
    await pool.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    console.log(`Database "${dbConfig.database}" ready`);
    
    connection.release();
    
    // Now reconnect with the database
    pool = mysql.createPool(dbConfig);
    const dbConnection = await pool.getConnection();
    console.log('Connected to MySQL database');
    
    // Create tables if they don't exist
    await createTables();
    
    // Check if tables exist and create default data if needed
    await ensureDefaultData();
    
    dbConnection.release();
  } catch (error) {
    console.error('Error connecting to MySQL database:', error.message);
  }
}

// Create tables if they don't exist
async function createTables() {
  try {
    // Users table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('Super Admin','Discipline Officer','Student') DEFAULT 'Student',
        full_name VARCHAR(100),
        department VARCHAR(100),
        status ENUM('pending','approved','rejected','suspended') DEFAULT 'approved',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
    console.log('Users table ready');
    
    // Students table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS students (
        student_id INT PRIMARY KEY AUTO_INCREMENT,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE,
        student_number VARCHAR(50) UNIQUE,
        year_level INT,
        course VARCHAR(100),
        education_level ENUM('Senior High School','College') DEFAULT 'College',
        contact_number VARCHAR(20),
        status ENUM('Active','Inactive') DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
    console.log('Students table ready');
    
    // Violations table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS violations (
        violation_id INT PRIMARY KEY AUTO_INCREMENT,
        violation_name VARCHAR(100) NOT NULL,
        category VARCHAR(50),
        description TEXT,
        severity ENUM('Category 1 Offense','Category 2 Offense','Category 3 Offense') DEFAULT 'Category 1 Offense',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
    console.log('Violations table ready');
    
    // Incidents (disciplinary_cases) table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS disciplinary_cases (
        case_id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL,
        violation_id INT NOT NULL,
        reported_by INT,
        date_reported DATE NOT NULL,
        case_status ENUM('Pending','Resolved','Under Review') DEFAULT 'Pending',
        action_taken TEXT,
        description TEXT,
        severity VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(student_id),
        FOREIGN KEY (violation_id) REFERENCES violations(violation_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
    console.log('Disciplinary cases table ready');
    
    // Disciplinary records table (for resolved cases)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS disciplinary_records (
        record_id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL,
        violation_id INT NOT NULL,
        reported_by INT,
        date_reported DATE NOT NULL,
        status ENUM('Pending','Resolved') DEFAULT 'Resolved',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(student_id),
        FOREIGN KEY (violation_id) REFERENCES violations(violation_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
    console.log('Disciplinary records table ready');
    
    // Sanctions table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS sanctions (
        sanction_id INT PRIMARY KEY AUTO_INCREMENT,
        record_id INT NOT NULL,
        sanction_type VARCHAR(100),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (record_id) REFERENCES disciplinary_records(record_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
    console.log('Sanctions table ready');
    
    // Courses table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS courses (
        course_id INT PRIMARY KEY AUTO_INCREMENT,
        course_name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
    console.log('Courses table ready');

    console.log('All tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error.message);
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

    // Update role enum to include only Super Admin, Discipline Officer, Student
    try {
      await pool.execute("ALTER TABLE users MODIFY COLUMN role ENUM('Super Admin','Discipline Officer','Student')");
      console.log('Updated role enum to include Super Admin, Discipline Officer, Student');
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

    // Update existing users with old roles to new roles
    try {
      // Convert Admin to Discipline Officer
      await pool.execute("UPDATE users SET role = 'Discipline Officer' WHERE role = 'Admin'");
      // Convert Faculty Staff to Discipline Officer
      await pool.execute("UPDATE users SET role = 'Discipline Officer' WHERE role = 'Faculty Staff'");
      console.log('Updated existing users with old roles to new roles');
    } catch (error) {
      // Might fail if no users, ignore
    }

    // Add contact_number column to students table if it doesn't exist
    try {
      await pool.execute('ALTER TABLE students ADD COLUMN contact_number VARCHAR(20)');
      console.log('Added contact_number column to students table');
    } catch (error) {
      // Column might already exist, ignore error
    }

    // Add email column to students table if it doesn't exist
    try {
      await pool.execute('ALTER TABLE students ADD COLUMN email VARCHAR(100)');
      console.log('Added email column to students table');
    } catch (error) {
      // Column might already exist, ignore error
    }



    // Add parent_email column to students table if it doesn't exist
    try {
      await pool.execute('ALTER TABLE students ADD COLUMN parent_email VARCHAR(100)');
      console.log('Added parent_email column to students table');
    } catch (error) {
      // Column might already exist, ignore error
    }

    // Add parent_phone column to students table if it doesn't exist
    try {
      await pool.execute('ALTER TABLE students ADD COLUMN parent_phone VARCHAR(20)');
      console.log('Added parent_phone column to students table');
    } catch (error) {
      // Column might already exist, ignore error
    }

    // Add education_level column to students table if it doesn't exist
    try {
      await pool.execute("ALTER TABLE students ADD COLUMN education_level ENUM('Senior High School', 'College') DEFAULT 'College'");
      console.log('Added education_level column to students table');
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

    // Update case_status enum to include Under Review and replace Open with Pending
    try {
      await pool.execute("ALTER TABLE disciplinary_cases MODIFY COLUMN case_status ENUM('Pending','Resolved','Under Review') DEFAULT 'Pending'");
      console.log('Updated case_status enum to include Under Review');
    } catch (error) {
      // Column might already have the correct enum, ignore error
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
        'INSERT INTO violations (violation_name, category, description) VALUES (?, ?, ?)',
        ['Late Attendance', 'Attendance', 'Student arrived late to class']
      );

      console.log('Default violation added');
    }

    // Create courses table if it doesn't exist
    try {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS courses (
          course_id INT PRIMARY KEY AUTO_INCREMENT,
          course_name VARCHAR(100) NOT NULL UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `);
      console.log('Created courses table');
    } catch (error) {
      // Table might already exist, ignore error
    }

    // Insert default courses if table is empty
    try {
      const [courseRows] = await pool.execute('SELECT COUNT(*) as count FROM courses');
      if (courseRows[0].count === 0) {
        const defaultCourses = [
          'BSIT',
          'BSCS',
          'BSBA',
          'BSENTREP',
          'BSOA',
          'BSAIS',
        ];

        for (const course of defaultCourses) {
          try {
            await pool.execute('INSERT INTO courses (course_name) VALUES (?)', [course]);
          } catch (error) {
            // Ignore duplicate errors
          }
        }
        console.log('Default courses added');
      }
    } catch (error) {
      // Table might not exist yet, ignore error
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
  getRow,
  getAllRows,
  runQuery
};