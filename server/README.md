# Student Disciplinary Record System - Backend

Express.js API server for the Student Disciplinary Record System.

## Features

- **Authentication**: JWT-based user authentication with role management
- **User Management**: Admin/faculty registration and management
- **Students Management**: Complete CRUD operations for student records
- **Disciplinary Records**: Full incident tracking and management
- **Sanctions Management**: Disciplinary actions and sanctions tracking
- **Audit Logging**: Complete audit trail for all system activities
- **MySQL Database**: Connected to XAMPP MySQL database
- **RESTful API**: Clean REST endpoints with proper error handling

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create environment file:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Start the server:
   ```bash
   npm run dev  # Development with nodemon
   npm start    # Production
   ```

## Default Admin Credentials

- Username: `admin`
- Password: `admin123`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new admin/faculty user
- `POST /api/auth/login` - Admin/faculty login
- `GET /api/auth/users` - Get all users (admin only)
- `GET /api/auth/verify` - Verify JWT token

### Students
- `GET /api/students` - Get all students
- `GET /api/students/:id` - Get student by ID
- `POST /api/students` - Create new student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Disciplinary Records (Incidents)
- `GET /api/incidents` - List all disciplinary records
- `GET /api/incidents/:id` - Get disciplinary record details
- `POST /api/incidents` - Create new disciplinary record
- `PUT /api/incidents/:id` - Update disciplinary record
- `DELETE /api/incidents/:id` - Delete disciplinary record
- `GET /api/incidents/violations/list` - Get all violation types

### Sanctions Management
- `GET /api/sanctions` - List all sanctions
- `GET /api/sanctions/record/:recordId` - Get sanctions for specific record
- `POST /api/sanctions` - Create new sanction
- `PUT /api/sanctions/:id` - Update sanction
- `DELETE /api/sanctions/:id` - Delete sanction

### Audit Logs
- `GET /api/audit` - Get all audit logs (admin only)
- `GET /api/audit/user/:userId` - Get audit logs for specific user
- `POST /api/audit` - Create manual audit log entry
- `GET /api/audit/stats/summary` - Get audit statistics (admin only)

### Health Check
- `GET /api/health` - Server health status

## Database Schema

### Tables (Connected to XAMPP MySQL)
- `users` - Admin/faculty users with roles and departments
- `students` - Student information (first_name, last_name, course, year_level, etc.)
- `disciplinary_records` - Disciplinary incidents/records
- `violations` - Types of violations with severity levels
- `sanctions` - Disciplinary sanctions and actions
- `audit_logs` - Complete audit trail of system activities

## Environment Variables

- `PORT` - Server port (default: 5000)
- `DB_HOST` - MySQL host (default: localhost)
- `DB_USER` - MySQL username (default: root)
- `DB_PASSWORD` - MySQL password (default: empty)
- `DB_NAME` - MySQL database name (default: student_disciplinary_db)
- `JWT_SECRET` - JWT signing secret
- `NODE_ENV` - Environment (development/production)

## Security

- All sensitive routes require JWT authentication
- Passwords are hashed with bcrypt
- CORS enabled for frontend integration