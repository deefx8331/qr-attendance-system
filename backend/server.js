const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'buk_qr_attendance_secret_key_2024';

// Middleware
app.use(cors());
app.use(express.json());
// Serve frontend for preview (single URL at localhost:3000)
app.use(express.static(path.join(__dirname, '../frontend')));

// Database connection pool (use DATABASE_URL on Railway/production, else local MySQL)
const dbUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
const pool = dbUrl
    ? mysql.createPool(dbUrl)
    : mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'qr_attendance_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

// ==================== AUTHENTICATION MIDDLEWARE ====================
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Role-based access control
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
};

// ==================== AUTH ROUTES ====================

// Register new user
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, full_name, reg_number, role, department, faculty, level } = req.body;
        
        // Validate required fields
        if (!email || !password || !full_name || !role) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Check if user exists
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert user
        const [result] = await pool.query(
            `INSERT INTO users (email, password, full_name, reg_number, role, department, faculty, level) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [email, hashedPassword, full_name, reg_number || null, role, department || null, faculty || null, level || null]
        );
        
        res.status(201).json({ 
            message: 'Registration successful',
            userId: result.insertId 
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = users[0];
        
        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                department: user.department,
                faculty: user.faculty
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get current user profile
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT id, email, full_name, reg_number, role, department, faculty, level, created_at FROM users WHERE id = ?',
            [req.user.id]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(users[0]);
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// ==================== COURSE ROUTES ====================

// Create a new course (Lecturer/Admin only)
app.post('/api/courses', authenticateToken, requireRole('lecturer', 'admin'), async (req, res) => {
    try {
        const { course_code, course_title, department, faculty, level, semester } = req.body;
        
        if (!course_code || !course_title) {
            return res.status(400).json({ error: 'Course code and title are required' });
        }
        
        const [result] = await pool.query(
            `INSERT INTO courses (course_code, course_title, lecturer_id, department, faculty, level, semester) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [course_code, course_title, req.user.id, department, faculty, level, semester]
        );
        
        res.status(201).json({
            message: 'Course created successfully',
            courseId: result.insertId
        });
    } catch (error) {
        console.error('Create course error:', error);
        res.status(500).json({ error: 'Failed to create course' });
    }
});

// Get all courses for a lecturer
app.get('/api/courses', authenticateToken, async (req, res) => {
    try {
        let query, params;
        
        if (req.user.role === 'student') {
            // Students see courses they're enrolled in
            query = `
                SELECT c.*, u.full_name as lecturer_name 
                FROM courses c 
                JOIN users u ON c.lecturer_id = u.id
                JOIN enrollments e ON c.id = e.course_id
                WHERE e.student_id = ?
                ORDER BY c.created_at DESC
            `;
            params = [req.user.id];
        } else {
            // Lecturers see their own courses
            query = `
                SELECT c.*, u.full_name as lecturer_name 
                FROM courses c 
                JOIN users u ON c.lecturer_id = u.id
                WHERE c.lecturer_id = ?
                ORDER BY c.created_at DESC
            `;
            params = [req.user.id];
        }
        
        const [courses] = await pool.query(query, params);
        res.json(courses);
    } catch (error) {
        console.error('Get courses error:', error);
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
});

// Get courses available for enrollment (students only) — must be before /:id so "available" is not treated as id
app.get('/api/courses/available', authenticateToken, requireRole('student'), async (req, res) => {
    try {
        const search = (req.query.search || '').trim();
        const searchPattern = search ? `%${search}%` : '%';
        
        const [courses] = await pool.query(
            `SELECT c.id, c.course_code, c.course_title, c.department, c.faculty, c.level, c.semester, u.full_name as lecturer_name
             FROM courses c
             JOIN users u ON c.lecturer_id = u.id
             WHERE c.id NOT IN (SELECT course_id FROM enrollments WHERE student_id = ?)
             AND (c.course_code LIKE ? OR c.course_title LIKE ? OR ? = '%')
             ORDER BY c.course_code`,
            [req.user.id, searchPattern, searchPattern, search ? null : '%']
        );
        
        res.json(courses);
    } catch (error) {
        console.error('Get available courses error:', error);
        res.status(500).json({ error: 'Failed to fetch available courses' });
    }
});

// Get single course
app.get('/api/courses/:id', authenticateToken, async (req, res) => {
    try {
        const [courses] = await pool.query(
            `SELECT c.*, u.full_name as lecturer_name 
             FROM courses c 
             JOIN users u ON c.lecturer_id = u.id
             WHERE c.id = ?`,
            [req.params.id]
        );
        
        if (courses.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }
        
        res.json(courses[0]);
    } catch (error) {
        console.error('Get course error:', error);
        res.status(500).json({ error: 'Failed to fetch course' });
    }
});

// Enroll student in course
app.post('/api/courses/:id/enroll', authenticateToken, requireRole('student'), async (req, res) => {
    try {
        const courseId = req.params.id;
        
        // Check if already enrolled
        const [existing] = await pool.query(
            'SELECT id FROM enrollments WHERE course_id = ? AND student_id = ?',
            [courseId, req.user.id]
        );
        
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Already enrolled in this course' });
        }
        
        await pool.query(
            'INSERT INTO enrollments (course_id, student_id) VALUES (?, ?)',
            [courseId, req.user.id]
        );
        
        res.status(201).json({ message: 'Enrolled successfully' });
    } catch (error) {
        console.error('Enrollment error:', error);
        res.status(500).json({ error: 'Enrollment failed' });
    }
});

// Get enrolled students for a course
app.get('/api/courses/:id/students', authenticateToken, requireRole('lecturer', 'admin'), async (req, res) => {
    try {
        const [students] = await pool.query(
            `SELECT u.id, u.full_name, u.reg_number, u.email, u.level, e.enrolled_at
             FROM users u
             JOIN enrollments e ON u.id = e.student_id
             WHERE e.course_id = ?
             ORDER BY u.full_name`,
            [req.params.id]
        );
        
        res.json(students);
    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});

// ==================== SESSION & QR CODE ROUTES ====================

// Create attendance session and generate QR code
app.post('/api/sessions', authenticateToken, requireRole('lecturer', 'admin'), async (req, res) => {
    try {
        const { course_id, session_title, duration_minutes = 15 } = req.body;
        
        if (!course_id) {
            return res.status(400).json({ error: 'Course ID is required' });
        }
        
        // Verify lecturer owns this course
        const [courses] = await pool.query(
            'SELECT id FROM courses WHERE id = ? AND lecturer_id = ?',
            [course_id, req.user.id]
        );
        
        if (courses.length === 0) {
            return res.status(403).json({ error: 'You do not own this course' });
        }
        
        // Generate unique session code
        const sessionCode = uuidv4();
        const expiresAt = new Date(Date.now() + duration_minutes * 60 * 1000);
        
        // Create session
        const [result] = await pool.query(
            `INSERT INTO attendance_sessions (course_id, session_code, session_title, expires_at, created_by) 
             VALUES (?, ?, ?, ?, ?)`,
            [course_id, sessionCode, session_title || `Session ${new Date().toLocaleDateString()}`, expiresAt, req.user.id]
        );
        
        // Generate QR code data
        const qrData = JSON.stringify({
            session_id: result.insertId,
            session_code: sessionCode,
            course_id: course_id,
            expires_at: expiresAt.toISOString()
        });
        
        // Generate QR code image as data URL
        const qrCodeImage = await QRCode.toDataURL(qrData, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });
        
        res.status(201).json({
            message: 'Session created successfully',
            session: {
                id: result.insertId,
                session_code: sessionCode,
                expires_at: expiresAt,
                qr_code: qrCodeImage,
                qr_data: qrData
            }
        });
    } catch (error) {
        console.error('Create session error:', error);
        res.status(500).json({ error: 'Failed to create session' });
    }
});

// Get active sessions for a course
app.get('/api/courses/:id/sessions', authenticateToken, async (req, res) => {
    try {
        const [sessions] = await pool.query(
            `SELECT s.*, 
                    (SELECT COUNT(*) FROM attendance_records WHERE session_id = s.id) as attendance_count
             FROM attendance_sessions s
             WHERE s.course_id = ?
             ORDER BY s.created_at DESC`,
            [req.params.id]
        );
        
        res.json(sessions);
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

// Get QR code for active session
app.get('/api/sessions/:id/qrcode', authenticateToken, requireRole('lecturer', 'admin'), async (req, res) => {
    try {
        const [sessions] = await pool.query(
            'SELECT * FROM attendance_sessions WHERE id = ?',
            [req.params.id]
        );
        
        if (sessions.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        const session = sessions[0];
        
        // Generate QR code
        const qrData = JSON.stringify({
            session_id: session.id,
            session_code: session.session_code,
            course_id: session.course_id,
            expires_at: session.expires_at
        });
        
        const qrCodeImage = await QRCode.toDataURL(qrData, {
            width: 400,
            margin: 2
        });
        
        res.json({
            session,
            qr_code: qrCodeImage,
            is_expired: new Date() > new Date(session.expires_at)
        });
    } catch (error) {
        console.error('Get QR code error:', error);
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});

// ==================== ATTENDANCE ROUTES ====================

// Mark attendance (student scans QR code)
app.post('/api/attendance/mark', authenticateToken, requireRole('student'), async (req, res) => {
    try {
        const { session_code, session_id } = req.body;
        
        if (!session_code || !session_id) {
            return res.status(400).json({ error: 'Session code and ID are required' });
        }
        
        // Verify session exists and is valid
        const [sessions] = await pool.query(
            'SELECT * FROM attendance_sessions WHERE id = ? AND session_code = ?',
            [session_id, session_code]
        );
        
        if (sessions.length === 0) {
            return res.status(404).json({ error: 'Invalid session' });
        }
        
        const session = sessions[0];
        
        // Check if session has expired
        if (new Date() > new Date(session.expires_at)) {
            return res.status(410).json({ error: 'This attendance session has expired' });
        }
        
        // Check if student is enrolled in the course
        const [enrollments] = await pool.query(
            'SELECT id FROM enrollments WHERE course_id = ? AND student_id = ?',
            [session.course_id, req.user.id]
        );
        
        if (enrollments.length === 0) {
            return res.status(403).json({ error: 'You are not enrolled in this course' });
        }
        
        // Check if already marked attendance
        const [existing] = await pool.query(
            'SELECT id FROM attendance_records WHERE session_id = ? AND student_id = ?',
            [session_id, req.user.id]
        );
        
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Attendance already marked for this session' });
        }
        
        // Mark attendance
        await pool.query(
            'INSERT INTO attendance_records (session_id, student_id, course_id) VALUES (?, ?, ?)',
            [session_id, req.user.id, session.course_id]
        );
        
        res.status(201).json({ 
            message: 'Attendance marked successfully',
            marked_at: new Date()
        });
    } catch (error) {
        console.error('Mark attendance error:', error);
        res.status(500).json({ error: 'Failed to mark attendance' });
    }
});

// Get attendance records for a session
app.get('/api/sessions/:id/attendance', authenticateToken, requireRole('lecturer', 'admin'), async (req, res) => {
    try {
        const [records] = await pool.query(
            `SELECT ar.*, u.full_name, u.reg_number, u.email
             FROM attendance_records ar
             JOIN users u ON ar.student_id = u.id
             WHERE ar.session_id = ?
             ORDER BY ar.marked_at`,
            [req.params.id]
        );
        
        res.json(records);
    } catch (error) {
        console.error('Get attendance error:', error);
        res.status(500).json({ error: 'Failed to fetch attendance records' });
    }
});

// Get student's attendance history
app.get('/api/attendance/history', authenticateToken, requireRole('student'), async (req, res) => {
    try {
        const [records] = await pool.query(
            `SELECT ar.*, c.course_code, c.course_title, s.session_title
             FROM attendance_records ar
             JOIN courses c ON ar.course_id = c.id
             JOIN attendance_sessions s ON ar.session_id = s.id
             WHERE ar.student_id = ?
             ORDER BY ar.marked_at DESC`,
            [req.user.id]
        );
        
        res.json(records);
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ error: 'Failed to fetch attendance history' });
    }
});

// Get attendance report for a course
app.get('/api/courses/:id/attendance-report', authenticateToken, requireRole('lecturer', 'admin'), async (req, res) => {
    try {
        const courseId = req.params.id;
        
        // Get all sessions for the course
        const [sessions] = await pool.query(
            'SELECT id, session_title, created_at FROM attendance_sessions WHERE course_id = ? ORDER BY created_at',
            [courseId]
        );
        
        // Get all enrolled students
        const [students] = await pool.query(
            `SELECT u.id, u.full_name, u.reg_number
             FROM users u
             JOIN enrollments e ON u.id = e.student_id
             WHERE e.course_id = ?
             ORDER BY u.full_name`,
            [courseId]
        );
        
        // Get attendance records
        const [records] = await pool.query(
            'SELECT student_id, session_id FROM attendance_records WHERE course_id = ?',
            [courseId]
        );
        
        // Build attendance matrix
        const attendanceMap = {};
        records.forEach(r => {
            const key = `${r.student_id}-${r.session_id}`;
            attendanceMap[key] = true;
        });
        
        const report = students.map(student => {
            const attendance = sessions.map(session => ({
                session_id: session.id,
                session_title: session.session_title,
                present: !!attendanceMap[`${student.id}-${session.id}`]
            }));
            
            const totalPresent = attendance.filter(a => a.present).length;
            const percentage = sessions.length > 0 ? Math.round((totalPresent / sessions.length) * 100) : 0;
            
            return {
                student_id: student.id,
                full_name: student.full_name,
                reg_number: student.reg_number,
                attendance,
                total_present: totalPresent,
                total_sessions: sessions.length,
                percentage
            };
        });
        
        res.json({
            course_id: courseId,
            sessions,
            students: report
        });
    } catch (error) {
        console.error('Get report error:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

// ==================== ADMIN ROUTES ====================

// Get all users (Admin only)
app.get('/api/admin/users', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT id, email, full_name, reg_number, role, department, faculty, level, created_at FROM users ORDER BY created_at DESC'
        );
        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get dashboard statistics
app.get('/api/admin/stats', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const [[{ total_users }]] = await pool.query('SELECT COUNT(*) as total_users FROM users');
        const [[{ total_students }]] = await pool.query("SELECT COUNT(*) as total_students FROM users WHERE role = 'student'");
        const [[{ total_lecturers }]] = await pool.query("SELECT COUNT(*) as total_lecturers FROM users WHERE role = 'lecturer'");
        const [[{ total_courses }]] = await pool.query('SELECT COUNT(*) as total_courses FROM courses');
        const [[{ total_sessions }]] = await pool.query('SELECT COUNT(*) as total_sessions FROM attendance_sessions');
        const [[{ total_attendance }]] = await pool.query('SELECT COUNT(*) as total_attendance FROM attendance_records');
        
        res.json({
            total_users,
            total_students,
            total_lecturers,
            total_courses,
            total_sessions,
            total_attendance
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Get all courses (Admin)
app.get('/api/admin/courses', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const [courses] = await pool.query(
            `SELECT c.*, u.full_name as lecturer_name,
                    (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as student_count
             FROM courses c
             JOIN users u ON c.lecturer_id = u.id
             ORDER BY c.created_at DESC`
        );
        res.json(courses);
    } catch (error) {
        console.error('Get all courses error:', error);
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
});

// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`QR Attendance Server running on http://localhost:${PORT}`);
    console.log('API Endpoints ready');
});

module.exports = app;
