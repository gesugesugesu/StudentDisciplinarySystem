const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database path
const dbPath = path.join(__dirname, '../data/disciplinary.db');
console.log('Database path:', dbPath);

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    console.error('Database path was:', dbPath);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  // Create students table
  db.run(`
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      grade TEXT NOT NULL,
      class TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      parentName TEXT,
      parentEmail TEXT,
      parentPhone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create incidents table
  db.run(`
    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      studentId TEXT NOT NULL,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      description TEXT NOT NULL,
      actionTaken TEXT,
      status TEXT DEFAULT 'Open',
      reportedBy TEXT NOT NULL,
      date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (studentId) REFERENCES students (id)
    )
  `);

  // Create communication_logs table
  db.run(`
    CREATE TABLE IF NOT EXISTS communication_logs (
      id TEXT PRIMARY KEY,
      incidentId TEXT NOT NULL,
      type TEXT NOT NULL,
      recipient TEXT NOT NULL,
      subject TEXT,
      message TEXT NOT NULL,
      sentAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'Sent',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (incidentId) REFERENCES incidents (id)
    )
  `);

  // Create admins table for authentication
  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, [], (err) => {
    if (err) {
      console.error('Error creating tables:', err.message);
    } else {
      // Insert default admin if not exists
      createDefaultAdmin();
    }
  });
}

// Create default admin user
function createDefaultAdmin() {
  const bcrypt = require('bcryptjs');

  db.get('SELECT * FROM admins WHERE username = ?', ['admin'], (err, row) => {
    if (err) {
      console.error('Error checking for default admin:', err.message);
      return;
    }

    if (!row) {
      const defaultPassword = 'admin123';
      const saltRounds = 10;

      bcrypt.hash(defaultPassword, saltRounds, (err, hash) => {
        if (err) {
          console.error('Error hashing password:', err.message);
          return;
        }

        db.run(
          'INSERT INTO admins (id, username, password_hash, email) VALUES (?, ?, ?, ?)',
          [`admin-${Date.now()}`, 'admin', hash, 'admin@school.edu'],
          (err) => {
            if (err) {
              console.error('Error creating default admin:', err.message);
            } else {
              console.log('Default admin created: username=admin, password=admin123');
            }
          }
        );
      });
    }
  });
}

// Helper function to run queries with promises
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

// Helper function to get single row
function getRow(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

// Helper function to get all rows
function getAllRows(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

module.exports = {
  db,
  runQuery,
  getRow,
  getAllRows
};