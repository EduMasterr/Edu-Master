-- EduMaster Pro - Hybrid Automation System
-- Version 1.0 (Phase 2: Database Schema)
-- Description: Core Schema for Multi-Branch System with 8 branches placeholder.
-- Supports: Users, Students, Teachers, Courses, Payments, Attendance.

-- ========================================================
-- 1. Core Tables: Branches & Users
-- ========================================================
CREATE TABLE IF NOT EXISTS branches (
    branch_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    manager_name VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- SHA256 or bcrypt placeholder
    full_name VARCHAR(100) NOT NULL,
    role ENUM('SuperAdmin', 'BranchAdmin', 'Teacher', 'Employee', 'Student', 'Parent') NOT NULL,
    branch_id INT, -- Null for SuperAdmin
    email VARCHAR(100),
    phone VARCHAR(20),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('Active', 'Inactive', 'Suspended') DEFAULT 'Active',
    FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE SET NULL
);

-- ========================================================
-- 2. Profiles (Role Specific Data)
-- ========================================================
CREATE TABLE IF NOT EXISTS parent_profiles (
    parent_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE NOT NULL,
    national_id VARCHAR(20),
    address TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_profiles (
    student_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE NOT NULL,
    parent_id INT, -- Links to a parent user
    birth_date DATE,
    grade_level VARCHAR(50), -- e.g. "Grade 10", "Level 2"
    school_name VARCHAR(100),
    gender ENUM('Male', 'Female'),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS teacher_profiles (
    teacher_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE NOT NULL,
    specialization VARCHAR(100), -- e.g. "English", "Math"
    hourly_rate DECIMAL(10, 2) DEFAULT 0.00,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ========================================================
-- 3. Academic Structure: Courses & Groups
-- ========================================================
CREATE TABLE IF NOT EXISTS courses (
    course_id INT PRIMARY KEY AUTO_INCREMENT,
    branch_id INT NOT NULL, -- Courses can be branch-specific or global (if branch_id is NULL)
    name VARCHAR(100) NOT NULL,
    description TEXT,
    level VARCHAR(50), -- e.g. "Beginner", "Advanced"
    base_price DECIMAL(10, 2) NOT NULL,
    duration_weeks INT DEFAULT 12,
    FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS groups (
    group_id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    teacher_id INT, -- Assigned teacher (from users table or teacher_profiles)
    branch_id INT NOT NULL,
    group_name VARCHAR(100), -- e.g. "English-L1-SatMon"
    schedule_days VARCHAR(50), -- e.g. "Sat,Mon,Wed"
    start_time TIME,
    end_time TIME,
    start_date DATE,
    end_date DATE,
    max_students INT DEFAULT 20,
    status ENUM('Planned', 'Active', 'Completed', 'Cancelled') DEFAULT 'Planned',
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE CASCADE
);

-- ========================================================
-- 4. Operations: Enrollments & Attendance
-- ========================================================
CREATE TABLE IF NOT EXISTS enrollments (
    enrollment_id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL, -- Links to users(user_id) for Student role
    group_id INT NOT NULL,
    enrollment_date DATE DEFAULT (CURRENT_DATE),
    final_agreed_price DECIMAL(10, 2), -- Include discount logic here later
    status ENUM('Active', 'Completed', 'Dropped', 'Transferred') DEFAULT 'Active',
    FOREIGN KEY (student_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attendance (
    attendance_id INT PRIMARY KEY AUTO_INCREMENT,
    enrollment_id INT NOT NULL,
    session_date DATE NOT NULL,
    status ENUM('Present', 'Absent', 'Late', 'Excused') DEFAULT 'Absent',
    notes TEXT,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enrollment_id) REFERENCES enrollments(enrollment_id) ON DELETE CASCADE
);

-- ========================================================
-- 5. Finance: Payments
-- ========================================================
CREATE TABLE IF NOT EXISTS payments (
    payment_id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL, -- Payer
    amount DECIMAL(10, 2) NOT NULL,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    payment_method ENUM('Cash', 'Visa', 'BankTransfer', 'Online') DEFAULT 'Cash',
    transaction_type ENUM('Tuition', 'BookFee', 'RegistrationFee', 'Other') DEFAULT 'Tuition',
    description VARCHAR(255),
    branch_id INT NOT NULL, -- Which branch receives same
    collected_by INT, -- Employee user_id
    FOREIGN KEY (student_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE CASCADE,
    FOREIGN KEY (collected_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- ========================================================
-- 6. Reports & Logs (Placeholder)
-- ========================================================
CREATE TABLE IF NOT EXISTS system_logs (
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(255),
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS generated_reports (
    report_id INT PRIMARY KEY AUTO_INCREMENT,
    report_type VARCHAR(50), -- "Monthly_Income", "Attendance_Summary"
    file_path VARCHAR(255), -- /reports/2026/jan/report.pdf
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INT
);
