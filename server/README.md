# Student Disciplinary Record System - Backend

Express.js API server for the Student Disciplinary Record System.

## Features

- **Authentication**: JWT-based admin authentication
- **Students Management**: CRUD operations for student records
- **Incidents Management**: Full incident tracking with communication logs
- **SQLite Database**: Lightweight, file-based database
- **RESTful API**: Clean REST endpoints

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

### Incidents
- `GET /api/incidents` - Get all incidents
- `GET /api/incidents/:id` - Get incident by ID
- `POST /api/incidents` - Create new incident
- `PUT /api/incidents/:id` - Update incident
- `DELETE /api/incidents/:id` - Delete incident
- `POST /api/incidents/:id/communication` - Add communication log
- `GET /api/incidents/:id/communication` - Get communication logs

### Health Check
- `GET /api/health` - Server health status

## Database Schema

### Tables
- `admins` - Admin users
- `students` - Student information
- `incidents` - Disciplinary incidents
- `communication_logs` - Parent/admin communications

## Environment Variables

- `PORT` - Server port (default: 5000)
- `JWT_SECRET` - JWT signing secret
- `NODE_ENV` - Environment (development/production)

## Security

- All sensitive routes require JWT authentication
- Passwords are hashed with bcrypt
- CORS enabled for frontend integration