const mysql = require('mysql2/promise');

// Source database configuration (student_disciplinary_db)
const sourceConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: 'student_disciplinary_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Target database configuration (dmanage)
const targetConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: 'dmanage',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let sourcePool, targetPool;

async function initializeConnections() {
  try {
    sourcePool = mysql.createPool(sourceConfig);
    targetPool = mysql.createPool(targetConfig);
    console.log('Connected to both databases');
  } catch (error) {
    console.error('Error connecting to databases:', error.message);
    process.exit(1);
  }
}

async function closeConnections() {
  if (sourcePool) await sourcePool.end();
  if (targetPool) await targetPool.end();
  console.log('Database connections closed');
}

async function tableExists(pool, tableName) {
  try {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = DATABASE() AND table_name = ?`,
      [tableName]
    );
    return rows[0].count > 0;
  } catch (error) {
    return false;
  }
}

async function dropTableIfExists(tableName) {
  try {
    await targetPool.execute(`DROP TABLE IF EXISTS ${tableName}`);
    console.log(`✓ Dropped existing table: ${tableName}`);
  } catch (error) {
    console.error(`Error dropping table ${tableName}:`, error.message);
  }
}

async function createTargetSchema() {
  console.log('\n=== Creating Target Database Schema ===');
  
  try {
    // Disable foreign key checks to allow dropping tables
    await targetPool.execute('SET FOREIGN_KEY_CHECKS = 0');
    console.log('✓ Disabled foreign key checks');

    // Drop existing tables in reverse order of dependencies
    await dropTableIfExists('audit_logs');
    await dropTableIfExists('sanctions');
    await dropTableIfExists('disciplinary_records');
    await dropTableIfExists('students');
    await dropTableIfExists('violations');
    await dropTableIfExists('users');

    // Create users table
    await targetPool.execute(`
      CREATE TABLE users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        password VARCHAR(255) NOT NULL,
        role ENUM('Super Admin','Discipline Officer','Student') NOT NULL,
        email VARCHAR(100) DEFAULT NULL,
        full_name VARCHAR(100) DEFAULT NULL,
        department VARCHAR(100) DEFAULT NULL,
        status ENUM('pending','approved','rejected','suspended') DEFAULT 'approved',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
    console.log('✓ Created users table');

    // Create violations table
    await targetPool.execute(`
      CREATE TABLE violations (
        violation_id INT AUTO_INCREMENT PRIMARY KEY,
        violation_name VARCHAR(100) NOT NULL,
        category VARCHAR(50) DEFAULT NULL,
        severity_level ENUM('Minor','Major','Severe') NOT NULL,
        description TEXT DEFAULT NULL,
        KEY idx_violation_name (violation_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
    console.log('✓ Created violations table');

    // Create students table
    await targetPool.execute(`
      CREATE TABLE students (
        student_id INT AUTO_INCREMENT PRIMARY KEY,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        course VARCHAR(100) DEFAULT NULL,
        year_level INT DEFAULT NULL,
        status ENUM('Active','Inactive','Suspended') DEFAULT 'Active',
        contact_number VARCHAR(20) DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_student_number (student_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
    console.log('✓ Created students table');

    // Create disciplinary_records table
    await targetPool.execute(`
      CREATE TABLE disciplinary_records (
        record_id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        violation_id INT NOT NULL,
        reported_by INT DEFAULT NULL,
        date_reported DATE NOT NULL,
        status ENUM('Pending','Resolved','Dismissed') DEFAULT 'Pending',
        KEY fk_dr_student (student_id),
        KEY fk_dr_violation (violation_id),
        KEY fk_dr_user (reported_by),
        KEY idx_record_status (status),
        CONSTRAINT fk_dr_student FOREIGN KEY (student_id) REFERENCES students (student_id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_dr_violation FOREIGN KEY (violation_id) REFERENCES violations (violation_id) ON UPDATE CASCADE,
        CONSTRAINT fk_dr_user FOREIGN KEY (reported_by) REFERENCES users (user_id) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
    console.log('✓ Created disciplinary_records table');

    // Create sanctions table
    await targetPool.execute(`
      CREATE TABLE sanctions (
        sanction_id INT AUTO_INCREMENT PRIMARY KEY,
        record_id INT NOT NULL,
        sanction_type VARCHAR(100) NOT NULL,
        description TEXT DEFAULT NULL,
        start_date DATE DEFAULT NULL,
        end_date DATE DEFAULT NULL,
        KEY fk_sanction_record (record_id),
        CONSTRAINT fk_sanction_record FOREIGN KEY (record_id) REFERENCES disciplinary_records (record_id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
    console.log('✓ Created sanctions table');

    // Create audit_logs table
    await targetPool.execute(`
      CREATE TABLE audit_logs (
        log_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT DEFAULT NULL,
        action VARCHAR(255) NOT NULL,
        timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY fk_audit_user (user_id),
        CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
    console.log('✓ Created audit_logs table');

    // Re-enable foreign key checks
    await targetPool.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✓ Re-enabled foreign key checks');

    console.log('Schema creation completed');
  } catch (error) {
    console.error('Error creating schema:', error.message);
    throw error;
  }
}

async function migrateUsers() {
  console.log('\n=== Migrating Users ===');
  try {
    const [users] = await sourcePool.execute('SELECT * FROM users');
    
    for (const user of users) {
      // Map old roles to new roles
      let newRole = user.role;
      if (user.role === 'Admin') {
        newRole = 'Discipline Officer';
      } else if (user.role === 'Guidance Counselor') {
        newRole = 'Discipline Officer';
      }

      // Check if user already exists by user_id
      const [existing] = await targetPool.execute(
        'SELECT user_id FROM users WHERE user_id = ?',
        [user.user_id]
      );

      if (existing.length === 0) {
        await targetPool.execute(
          `INSERT INTO users (user_id, password, role, email, full_name, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            user.user_id,
            user.password,
            newRole,
            user.email,
            user.username || 'System User',
            'approved',
            user.created_at
          ]
        );
        console.log(`✓ Migrated user: ${user.email || user.username || user.user_id} (role: ${newRole})`);
      } else {
        console.log(`- Skipped existing user: ${user.email || user.username || user.user_id}`);
      }
    }
    console.log(`Users migration completed`);
  } catch (error) {
    console.error('Error migrating users:', error.message);
    throw error;
  }
}

async function migrateViolations() {
  console.log('\n=== Migrating Violations ===');
  try {
    const [violations] = await sourcePool.execute('SELECT * FROM violations');
    
    for (const violation of violations) {
      // Check if violation already exists by name
      const [existing] = await targetPool.execute(
        'SELECT violation_id FROM violations WHERE violation_name = ?',
        [violation.violation_name]
      );

      if (existing.length === 0) {
        await targetPool.execute(
          `INSERT INTO violations (violation_id, violation_name, category, severity_level, description)
           VALUES (?, ?, ?, ?, ?)`,
          [
            violation.violation_id,
            violation.violation_name,
            violation.category,
            violation.severity_level,
            violation.description
          ]
        );
        console.log(`✓ Migrated violation: ${violation.violation_name}`);
      } else {
        console.log(`- Skipped existing violation: ${violation.violation_name}`);
      }
    }
    console.log(`Violations migration completed`);
  } catch (error) {
    console.error('Error migrating violations:', error.message);
    throw error;
  }
}

async function migrateStudents() {
  console.log('\n=== Migrating Students ===');
  try {
    const [students] = await sourcePool.execute('SELECT * FROM students');
    
    for (const student of students) {
      // Check if student already exists by first_name, last_name, and course
      const [existing] = await targetPool.execute(
        'SELECT student_id FROM students WHERE first_name = ? AND last_name = ? AND course = ?',
        [student.first_name, student.last_name, student.course]
      );

      if (existing.length === 0) {
        await targetPool.execute(
          `INSERT INTO students (student_id, first_name, last_name, course, year_level, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            student.student_id,
            student.first_name,
            student.last_name,
            student.course,
            student.year_level,
            student.status,
            student.created_at
          ]
        );
        console.log(`✓ Migrated student: ${student.first_name} ${student.last_name}`);
      } else {
        console.log(`- Skipped existing student: ${student.first_name} ${student.last_name}`);
      }
    }
    console.log(`Students migration completed`);
  } catch (error) {
    console.error('Error migrating students:', error.message);
    throw error;
  }
}

async function migrateDisciplinaryRecords() {
  console.log('\n=== Migrating Disciplinary Records ===');
  try {
    const [records] = await sourcePool.execute('SELECT * FROM disciplinary_records');
    
    for (const record of records) {
      // Check if record already exists
      const [existing] = await targetPool.execute(
        'SELECT record_id FROM disciplinary_records WHERE record_id = ?',
        [record.record_id]
      );

      if (existing.length === 0) {
        await targetPool.execute(
          `INSERT INTO disciplinary_records (record_id, student_id, violation_id, reported_by, date_reported, status)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            record.record_id,
            record.student_id,
            record.violation_id,
            record.reported_by,
            record.date_reported,
            record.status
          ]
        );
        console.log(`✓ Migrated disciplinary record: ${record.record_id}`);
      } else {
        console.log(`- Skipped existing disciplinary record: ${record.record_id}`);
      }
    }
    console.log(`Disciplinary records migration completed`);
  } catch (error) {
    console.error('Error migrating disciplinary records:', error.message);
    throw error;
  }
}

async function migrateSanctions() {
  console.log('\n=== Migrating Sanctions ===');
  try {
    const [sanctions] = await sourcePool.execute('SELECT * FROM sanctions');
    
    for (const sanction of sanctions) {
      // Check if sanction already exists
      const [existing] = await targetPool.execute(
        'SELECT sanction_id FROM sanctions WHERE sanction_id = ?',
        [sanction.sanction_id]
      );

      if (existing.length === 0) {
        await targetPool.execute(
          `INSERT INTO sanctions (sanction_id, record_id, sanction_type, description, start_date, end_date)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            sanction.sanction_id,
            sanction.record_id,
            sanction.sanction_type,
            sanction.description,
            sanction.start_date,
            sanction.end_date
          ]
        );
        console.log(`✓ Migrated sanction: ${sanction.sanction_id}`);
      } else {
        console.log(`- Skipped existing sanction: ${sanction.sanction_id}`);
      }
    }
    console.log(`Sanctions migration completed`);
  } catch (error) {
    console.error('Error migrating sanctions:', error.message);
    throw error;
  }
}

async function migrateAuditLogs() {
  console.log('\n=== Migrating Audit Logs ===');
  try {
    const [logs] = await sourcePool.execute('SELECT * FROM audit_logs');
    
    for (const log of logs) {
      // Check if log already exists
      const [existing] = await targetPool.execute(
        'SELECT log_id FROM audit_logs WHERE log_id = ?',
        [log.log_id]
      );

      if (existing.length === 0) {
        await targetPool.execute(
          `INSERT INTO audit_logs (log_id, user_id, action, timestamp)
           VALUES (?, ?, ?, ?)`,
          [
            log.log_id,
            log.user_id,
            log.action,
            log.timestamp
          ]
        );
        console.log(`✓ Migrated audit log: ${log.log_id}`);
      } else {
        console.log(`- Skipped existing audit log: ${log.log_id}`);
      }
    }
    console.log(`Audit logs migration completed`);
  } catch (error) {
    console.error('Error migrating audit logs:', error.message);
    throw error;
  }
}

async function runMigration() {
  console.log('========================================');
  console.log('Starting Data Migration');
  console.log('Source: student_disciplinary_db');
  console.log('Target: dmanage');
  console.log('========================================');

  try {
    await initializeConnections();
    await createTargetSchema();

    // Migrate in order to respect foreign key constraints
    await migrateUsers();
    await migrateViolations();
    await migrateStudents();
    await migrateDisciplinaryRecords();
    await migrateSanctions();
    await migrateAuditLogs();

    console.log('\n========================================');
    console.log('✓ Migration completed successfully!');
    console.log('========================================');
  } catch (error) {
    console.error('\n========================================');
    console.error('✗ Migration failed!');
    console.error('========================================');
    console.error(error);
    process.exit(1);
  } finally {
    await closeConnections();
  }
}

// Run the migration
runMigration();
