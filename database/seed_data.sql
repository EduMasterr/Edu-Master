-- ========================================================
-- SEED DATA (Placeholders)
-- Supports: 8 Branches, Sample Students, Courses.
-- ========================================================

-- 1. Insert 8 Branches
INSERT INTO branches (name, manager_name, address) VALUES
('EduMaster Main Branch', 'Ahmed Khalil', 'Downtown, Cairo'),
('EduMaster Alex Branch', 'Sarah Ali', 'Sidi Gaber, Alexandria'),
('EduMaster October', 'Mohamed Hassan', '6th of October City'),
('EduMaster Nasr City', 'Khaled Fawzy', 'Nasr City, Cairo'),
('EduMaster Maadi', 'Nour El-Din', 'Maadi, Cairo'),
('EduMaster Mansoura', 'Heba Reda', 'University District, Mansoura'),
('EduMaster Tanta', 'Youssef Kamal', 'El-Gharbia, Tanta'),
('EduMaster Online Hub', 'Mona Zaki', 'Virtual Office');

-- 2. Insert Core Users (Admins & Staff)
INSERT INTO users (username, password_hash, full_name, role, branch_id, email, phone) VALUES
('superadmin', 'hashed_pass_123', 'System Administrator', 'SuperAdmin', NULL, 'admin@edumaster.com', '01000000000'),
('manager_cairo', 'pass_cairo', 'Main Branch Manager', 'BranchAdmin', 1, 'cairo@edumaster.com', '01111111111'),
('reception_alex', 'pass_alex', 'Alex Reception', 'Employee', 2, 'alex.rec@edumaster.com', '01222222222'),
('teacher_eng', 'pass_eng', 'Mr. English Teacher', 'Teacher', 1, 'eng.teacher@edumaster.com', '01012345678');

-- 3. Insert Courses (Sample for Main Branch & Alex)
-- English Levels
INSERT INTO courses (branch_id, name, level, base_price) VALUES
(1, 'General English', 'Level 1', 1200.00),
(1, 'General English', 'Level 2', 1300.00),
(2, 'IELTS Preparation', 'Advanced', 2500.00),
(3, 'Business English', 'Intermediate', 1800.00);

-- Programming
INSERT INTO courses (branch_id, name, level, base_price) VALUES
(1, 'Web Development Bootcamp', 'Beginner', 5000.00),
(4, 'Python Data Science', 'Intermediate', 4500.00);

-- Kids
INSERT INTO courses (branch_id, name, level, base_price) VALUES
(2, 'Robotics for Kids', 'Level 1', 1500.00),
(5, 'Mental Math', 'Level 1', 800.00);


-- 4. Insert Groups (Classes)
INSERT INTO groups (course_id, teacher_id, branch_id, group_name, schedule_days, start_date, end_date) VALUES
(1, 4, 1, 'GE-L1-SatMon-A', 'Sat, Mon', '2026-03-01', '2026-05-01'),
(1, 4, 1, 'GE-L1-SunTue-B', 'Sun, Tue', '2026-03-02', '2026-05-02'),
(2, 4, 2, 'IELTS-Adv-Fri', 'Fri', '2026-03-05', '2026-06-05');


-- 5. Insert Students (Sample 50 Students for demonstration, scaling to 3000 would require loop or bulk insert script)
-- Here we demo the structure. In a real script, we'd loop 3000 times.
-- For this file, we insert a representative batch.

INSERT INTO users (username, password_hash, full_name, role, branch_id, email, phone) VALUES
('student_001', 'pass1', 'Ahmed Mohamed', 'Student', 1, 's1@edu.com', '01011111111'),
('student_002', 'pass2', 'Sara Ahmed', 'Student', 1, 's2@edu.com', '01022222222'),
('student_003', 'pass3', 'Omar Khaled', 'Student', 2, 's3@edu.com', '01033333333'),
('student_004', 'pass4', 'Laila Youssef', 'Student', 3, 's4@edu.com', '01044444444'),
('student_005', 'pass5', 'Hassan Ali', 'Student', 4, 's5@edu.com', '01055555555'); 
-- ... (Imagine 2995 more rows here)

-- 6. Enroll Students in Groups
INSERT INTO enrollments (student_id, group_id, final_agreed_price, status) VALUES
(5, 1, 1200.00, 'Active'), -- Ahmed in GE Level 1
(6, 1, 1200.00, 'Active'), -- Sara in GE Level 1
(7, 3, 2500.00, 'Active'); -- Omar in IELTS

-- 7. Record Usage (Attendance & Payments)
INSERT INTO attendance (enrollment_id, session_date, status) VALUES
(1, '2026-03-01', 'Present'),
(2, '2026-03-01', 'Absent'),
(3, '2026-03-05', 'Present');

INSERT INTO payments (student_id, amount, transaction_type, branch_id, collected_by) VALUES
(5, 600.00, 'Tuition', 1, 3), -- Partial payment
(6, 1200.00, 'Tuition', 1, 3); -- Full payment
