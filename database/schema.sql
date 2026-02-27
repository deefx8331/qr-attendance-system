-- ============================================================
-- QR CODE ATTENDANCE MANAGEMENT SYSTEM DATABASE
-- Bayero University Kano
-- ============================================================

-- Create database
CREATE DATABASE IF NOT EXISTS qr_attendance_db;
USE qr_attendance_db;

-- ============================================================
-- USERS TABLE
-- Stores all users: students, lecturers, and admins
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    reg_number VARCHAR(50) UNIQUE,
    role ENUM('student', 'lecturer', 'admin') NOT NULL DEFAULT 'student',
    department VARCHAR(100),
    faculty VARCHAR(100),
    level VARCHAR(20),
    phone VARCHAR(20),
    profile_image VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_reg_number (reg_number)
);

-- ============================================================
-- COURSES TABLE
-- Stores course information
-- ============================================================
CREATE TABLE IF NOT EXISTS courses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_code VARCHAR(20) NOT NULL,
    course_title VARCHAR(200) NOT NULL,
    lecturer_id INT NOT NULL,
    department VARCHAR(100),
    faculty VARCHAR(100),
    level VARCHAR(20),
    semester VARCHAR(50),
    academic_year VARCHAR(20),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_course_code (course_code),
    INDEX idx_lecturer (lecturer_id)
);

-- ============================================================
-- ENROLLMENTS TABLE
-- Links students to courses
-- ============================================================
CREATE TABLE IF NOT EXISTS enrollments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    student_id INT NOT NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_enrollment (course_id, student_id),
    INDEX idx_course (course_id),
    INDEX idx_student (student_id)
);

-- ============================================================
-- ATTENDANCE SESSIONS TABLE
-- Stores each attendance session with QR code data
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    session_code VARCHAR(100) UNIQUE NOT NULL,
    session_title VARCHAR(200),
    session_date DATE,
    start_time TIME,
    end_time TIME,
    expires_at DATETIME NOT NULL,
    location VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_session_code (session_code),
    INDEX idx_course (course_id),
    INDEX idx_expires (expires_at)
);

-- ============================================================
-- ATTENDANCE RECORDS TABLE
-- Stores individual attendance records
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(50),
    device_info VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_attendance (session_id, student_id),
    INDEX idx_session (session_id),
    INDEX idx_student (student_id),
    INDEX idx_course (course_id),
    INDEX idx_marked_at (marked_at)
);

-- ============================================================
-- ACTIVITY LOGS TABLE
-- For audit trail
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_created (created_at)
);

-- ============================================================
-- INSERT DEFAULT ADMIN USER
-- Password: admin123 (hashed with bcrypt)
-- ============================================================
INSERT INTO users (email, password, full_name, role, department, faculty) VALUES
('admin@buk.edu.ng', '$2a$10$ZVKSkyBvBfbRQsKVAZflbeWAKL92C1J2d16Si2.u.1j7pQzwi9pHy', 'System Administrator', 'admin', 'ICT Directorate', 'Administration');

-- ============================================================
-- INSERT SAMPLE DATA FOR TESTING
-- ============================================================

-- Sample Lecturers (password: password123)
INSERT INTO users (email, password, full_name, role, department, faculty) VALUES
('lecturer1@buk.edu.ng', '$2a$10$AUbDCfoqc.WKu8nRNm93PeLTzC7nRwQvCPrVCekbN/WO6DR/L5HaC', 'Dr. Aminu Ibrahim', 'lecturer', 'Computer Science', 'Computing'),
('lecturer2@buk.edu.ng', '$2a$10$AUbDCfoqc.WKu8nRNm93PeLTzC7nRwQvCPrVCekbN/WO6DR/L5HaC', 'Dr. Fatima Sani', 'lecturer', 'Computer Science', 'Computing');

-- Sample Students (password: password123)
INSERT INTO users (email, password, full_name, reg_number, role, department, faculty, level) VALUES
('student1@buk.edu.ng', '$2a$10$AUbDCfoqc.WKu8nRNm93PeLTzC7nRwQvCPrVCekbN/WO6DR/L5HaC', 'Muhammad Abdullahi', 'BUK/CS/20/1001', 'student', 'Computer Science', 'Computing', '400'),
('student2@buk.edu.ng', '$2a$10$AUbDCfoqc.WKu8nRNm93PeLTzC7nRwQvCPrVCekbN/WO6DR/L5HaC', 'Aisha Bello', 'BUK/CS/20/1002', 'student', 'Computer Science', 'Computing', '400'),
('student3@buk.edu.ng', '$2a$10$AUbDCfoqc.WKu8nRNm93PeLTzC7nRwQvCPrVCekbN/WO6DR/L5HaC', 'Ibrahim Musa', 'BUK/CS/20/1003', 'student', 'Computer Science', 'Computing', '400');

-- Sample Courses
INSERT INTO courses (course_code, course_title, lecturer_id, department, faculty, level, semester) VALUES
('CSC 401', 'Software Engineering', 2, 'Computer Science', 'Computing', '400', 'First Semester'),
('CSC 403', 'Database Management Systems', 2, 'Computer Science', 'Computing', '400', 'First Semester'),
('CSC 405', 'Computer Networks', 3, 'Computer Science', 'Computing', '400', 'First Semester'),
('CSC 407', 'Artificial Intelligence', 2, 'Computer Science', 'Computing', '400', 'First Semester'),
('CSC 409', 'Project', 3, 'Computer Science', 'Computing', '400', 'Second Semester');

-- Sample Enrollments (student1 & student2 in first 3 only; student3 in first 2 only — so all have courses to enroll in)
INSERT INTO enrollments (course_id, student_id) VALUES
(1, 4), (1, 5), (1, 6),
(2, 4), (2, 5), (2, 6),
(3, 4), (3, 5);

-- ============================================================
-- VIEWS FOR REPORTING
-- ============================================================

-- View: Course Attendance Summary
CREATE OR REPLACE VIEW vw_course_attendance_summary AS
SELECT 
    c.id as course_id,
    c.course_code,
    c.course_title,
    u.full_name as lecturer_name,
    COUNT(DISTINCT e.student_id) as enrolled_students,
    COUNT(DISTINCT s.id) as total_sessions,
    COUNT(DISTINCT ar.id) as total_attendance_records
FROM courses c
JOIN users u ON c.lecturer_id = u.id
LEFT JOIN enrollments e ON c.id = e.course_id
LEFT JOIN attendance_sessions s ON c.id = s.course_id
LEFT JOIN attendance_records ar ON s.id = ar.session_id
GROUP BY c.id, c.course_code, c.course_title, u.full_name;

-- View: Student Attendance Summary
CREATE OR REPLACE VIEW vw_student_attendance_summary AS
SELECT 
    u.id as student_id,
    u.full_name,
    u.reg_number,
    c.course_code,
    c.course_title,
    COUNT(DISTINCT s.id) as total_sessions,
    COUNT(DISTINCT ar.id) as sessions_attended,
    ROUND((COUNT(DISTINCT ar.id) / COUNT(DISTINCT s.id)) * 100, 2) as attendance_percentage
FROM users u
JOIN enrollments e ON u.id = e.student_id
JOIN courses c ON e.course_id = c.id
LEFT JOIN attendance_sessions s ON c.id = s.course_id
LEFT JOIN attendance_records ar ON s.id = ar.session_id AND ar.student_id = u.id
WHERE u.role = 'student'
GROUP BY u.id, u.full_name, u.reg_number, c.course_code, c.course_title;

-- ============================================================
-- STORED PROCEDURES
-- ============================================================

-- Procedure: Get Attendance Report for a Course
DELIMITER //
CREATE PROCEDURE sp_get_course_attendance_report(IN p_course_id INT)
BEGIN
    SELECT 
        u.reg_number,
        u.full_name,
        COUNT(DISTINCT s.id) as total_sessions,
        COUNT(DISTINCT ar.id) as attended,
        COUNT(DISTINCT s.id) - COUNT(DISTINCT ar.id) as absent,
        ROUND((COUNT(DISTINCT ar.id) / COUNT(DISTINCT s.id)) * 100, 2) as percentage
    FROM users u
    JOIN enrollments e ON u.id = e.student_id
    LEFT JOIN attendance_sessions s ON e.course_id = s.course_id
    LEFT JOIN attendance_records ar ON s.id = ar.session_id AND ar.student_id = u.id
    WHERE e.course_id = p_course_id
    GROUP BY u.id, u.reg_number, u.full_name
    ORDER BY u.full_name;
END //
DELIMITER ;

-- Procedure: Check if attendance can be marked
DELIMITER //
CREATE PROCEDURE sp_check_attendance_eligibility(
    IN p_session_id INT, 
    IN p_student_id INT,
    OUT p_can_mark BOOLEAN,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_expires_at DATETIME;
    DECLARE v_course_id INT;
    DECLARE v_enrolled INT;
    DECLARE v_already_marked INT;
    
    -- Get session details
    SELECT expires_at, course_id INTO v_expires_at, v_course_id
    FROM attendance_sessions WHERE id = p_session_id;
    
    IF v_expires_at IS NULL THEN
        SET p_can_mark = FALSE;
        SET p_message = 'Session not found';
    ELSEIF NOW() > v_expires_at THEN
        SET p_can_mark = FALSE;
        SET p_message = 'Session has expired';
    ELSE
        -- Check enrollment
        SELECT COUNT(*) INTO v_enrolled FROM enrollments 
        WHERE course_id = v_course_id AND student_id = p_student_id;
        
        IF v_enrolled = 0 THEN
            SET p_can_mark = FALSE;
            SET p_message = 'Not enrolled in this course';
        ELSE
            -- Check if already marked
            SELECT COUNT(*) INTO v_already_marked FROM attendance_records
            WHERE session_id = p_session_id AND student_id = p_student_id;
            
            IF v_already_marked > 0 THEN
                SET p_can_mark = FALSE;
                SET p_message = 'Attendance already marked';
            ELSE
                SET p_can_mark = TRUE;
                SET p_message = 'Eligible to mark attendance';
            END IF;
        END IF;
    END IF;
END //
DELIMITER ;

-- ============================================================
-- END OF DATABASE SCHEMA
-- ============================================================
