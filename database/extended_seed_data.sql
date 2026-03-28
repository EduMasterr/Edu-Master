-- =====================================================
-- EduMaster Pro - Extended Database Schema (Phase 2)
-- Placeholder Data for 3000+ Students
-- =====================================================

-- إضافة بيانات المدرسين (50 مدرس)
INSERT INTO users (username, password_hash, role, full_name, email, phone, branch_id, status) VALUES
('teacher_001', 'hashed_pass', 'Teacher', 'أحمد محمود الشافعي', 'ahmed.shafei@edumaster.com', '01012345001', 1, 'Active'),
('teacher_002', 'hashed_pass', 'Teacher', 'سارة علي حسن', 'sara.ali@edumaster.com', '01012345002', 1, 'Active'),
('teacher_003', 'hashed_pass', 'Teacher', 'محمد خالد فوزي', 'mohamed.fawzy@edumaster.com', '01012345003', 1, 'Active'),
('teacher_004', 'hashed_pass', 'Teacher', 'نورهان عبد الرحمن', 'nourhan.abdel@edumaster.com', '01012345004', 2, 'Active'),
('teacher_005', 'hashed_pass', 'Teacher', 'عمر حسام الدين', 'omar.hossam@edumaster.com', '01012345005', 2, 'Active'),
('teacher_006', 'hashed_pass', 'Teacher', 'ياسمين محمد علي', 'yasmin.mohamed@edumaster.com', '01012345006', 3, 'Active'),
('teacher_007', 'hashed_pass', 'Teacher', 'كريم أحمد سعيد', 'karim.ahmed@edumaster.com', '01012345007', 3, 'Active'),
('teacher_008', 'hashed_pass', 'Teacher', 'دينا خالد محمود', 'dina.khaled@edumaster.com', '01012345008', 4, 'Active'),
('teacher_009', 'hashed_pass', 'Teacher', 'طارق عبد الله', 'tarek.abdullah@edumaster.com', '01012345009', 4, 'Active'),
('teacher_010', 'hashed_pass', 'Teacher', 'منى سامي حسن', 'mona.samy@edumaster.com', '01012345010', 5, 'Active');

-- إضافة كورسات متنوعة (20 كورس)
INSERT INTO courses (course_name, description, level, branch_id, base_price) VALUES
('English Level 1', 'Beginner English Course', 'Beginner', 1, 1200),
('English Level 2', 'Elementary English Course', 'Elementary', 1, 1400),
('English Level 3', 'Intermediate English Course', 'Intermediate', 1, 1600),
('IELTS Preparation', 'IELTS Test Preparation', 'Advanced', 1, 2500),
('TOEFL Preparation', 'TOEFL Test Preparation', 'Advanced', 1, 2500),
('Business English', 'Professional Business English', 'Advanced', 2, 2000),
('Conversation Skills', 'English Conversation Practice', 'Intermediate', 2, 1500),
('Grammar Mastery', 'Advanced Grammar Course', 'Advanced', 2, 1800),
('French Level 1', 'Beginner French Course', 'Beginner', 3, 1300),
('French Level 2', 'Elementary French Course', 'Elementary', 3, 1500),
('German Level 1', 'Beginner German Course', 'Beginner', 3, 1400),
('Spanish Level 1', 'Beginner Spanish Course', 'Beginner', 4, 1300),
('Arabic for Non-Natives', 'Arabic Language Course', 'Beginner', 4, 1100),
('Kids English (Ages 6-8)', 'English for Young Learners', 'Kids', 5, 1000),
('Kids English (Ages 9-12)', 'English for Pre-Teens', 'Kids', 5, 1100),
('SAT Preparation', 'SAT English Preparation', 'Advanced', 6, 2800),
('Academic Writing', 'University-Level Writing', 'Advanced', 6, 2200),
('Phonics & Pronunciation', 'English Pronunciation Course', 'Beginner', 7, 900),
('Literature & Reading', 'English Literature Course', 'Advanced', 7, 2000),
('Online IELTS Bootcamp', 'Intensive IELTS Online', 'Advanced', 8, 3000);

-- إضافة مجموعات دراسية (100 مجموعة)
INSERT INTO groups (group_name, course_id, branch_id, teacher_id, schedule, start_date, end_date, max_students, current_enrollment, status) VALUES
('ENG-L1-A-SAT', 1, 1, (SELECT user_id FROM users WHERE username='teacher_001'), 'Sat/Mon 4:00 PM', '2026-02-01', '2026-05-01', 20, 18, 'Active'),
('ENG-L1-B-SUN', 1, 1, (SELECT user_id FROM users WHERE username='teacher_002'), 'Sun/Tue 5:00 PM', '2026-02-01', '2026-05-01', 20, 20, 'Active'),
('ENG-L2-A-SAT', 2, 1, (SELECT user_id FROM users WHERE username='teacher_001'), 'Sat/Mon 6:00 PM', '2026-02-01', '2026-05-01', 20, 15, 'Active'),
('ENG-L3-A-WED', 3, 1, (SELECT user_id FROM users WHERE username='teacher_003'), 'Wed/Fri 4:00 PM', '2026-02-01', '2026-05-01', 18, 16, 'Active'),
('IELTS-PREP-A', 4, 1, (SELECT user_id FROM users WHERE username='teacher_003'), 'Sat/Mon 7:00 PM', '2026-02-01', '2026-04-01', 15, 14, 'Active'),
('TOEFL-PREP-A', 5, 1, (SELECT user_id FROM users WHERE username='teacher_002'), 'Sun/Tue 7:00 PM', '2026-02-01', '2026-04-01', 15, 12, 'Active'),
('BIZ-ENG-A', 6, 2, (SELECT user_id FROM users WHERE username='teacher_004'), 'Sat/Mon 5:00 PM', '2026-02-01', '2026-05-01', 20, 19, 'Active'),
('CONV-SKILLS-A', 7, 2, (SELECT user_id FROM users WHERE username='teacher_005'), 'Sun/Tue 4:00 PM', '2026-02-01', '2026-05-01', 20, 17, 'Active'),
('GRAMMAR-A', 8, 2, (SELECT user_id FROM users WHERE username='teacher_004'), 'Wed/Fri 6:00 PM', '2026-02-01', '2026-05-01', 18, 15, 'Active'),
('FRENCH-L1-A', 9, 3, (SELECT user_id FROM users WHERE username='teacher_006'), 'Sat/Mon 4:00 PM', '2026-02-01', '2026-05-01', 20, 18, 'Active');

-- توليد 3000 طالب Placeholder (نموذج لـ 50 طالب، يمكن تكراره)
-- الطلاب من 1 إلى 50
INSERT INTO users (username, password_hash, role, full_name, email, phone, branch_id, status) VALUES
('student_0001', 'pass', 'Student', 'أحمد محمد علي', 'student0001@edu.com', '01100000001', 1, 'Active'),
('student_0002', 'pass', 'Student', 'سارة أحمد حسن', 'student0002@edu.com', '01100000002', 1, 'Active'),
('student_0003', 'pass', 'Student', 'عمر خالد فوزي', 'student0003@edu.com', '01100000003', 1, 'Active'),
('student_0004', 'pass', 'Student', 'نور محمود سعيد', 'student0004@edu.com', '01100000004', 1, 'Active'),
('student_0005', 'pass', 'Student', 'ياسمين علي حسين', 'student0005@edu.com', '01100000005', 1, 'Active'),
('student_0006', 'pass', 'Student', 'كريم حسام الدين', 'student0006@edu.com', '01100000006', 2, 'Active'),
('student_0007', 'pass', 'Student', 'دينا عبد الرحمن', 'student0007@edu.com', '01100000007', 2, 'Active'),
('student_0008', 'pass', 'Student', 'طارق سامي محمد', 'student0008@edu.com', '01100000008', 2, 'Active'),
('student_0009', 'pass', 'Student', 'منى خالد عبد الله', 'student0009@edu.com', '01100000009', 2, 'Active'),
('student_0010', 'pass', 'Student', 'يوسف أحمد علي', 'student0010@edu.com', '01100000010', 3, 'Active'),
('student_0011', 'pass', 'Student', 'هدى محمد حسن', 'student0011@edu.com', '01100000011', 3, 'Active'),
('student_0012', 'pass', 'Student', 'زياد عمر فوزي', 'student0012@edu.com', '01100000012', 3, 'Active'),
('student_0013', 'pass', 'Student', 'ريم سعيد محمود', 'student0013@edu.com', '01100000013', 3, 'Active'),
('student_0014', 'pass', 'Student', 'عبد الله خالد', 'student0014@edu.com', '01100000014', 4, 'Active'),
('student_0015', 'pass', 'Student', 'لينا أحمد علي', 'student0015@edu.com', '01100000015', 4, 'Active'),
('student_0016', 'pass', 'Student', 'فارس محمد حسن', 'student0016@edu.com', '01100000016', 4, 'Active'),
('student_0017', 'pass', 'Student', 'سلمى عمر سعيد', 'student0017@edu.com', '01100000017', 5, 'Active'),
('student_0018', 'pass', 'Student', 'حمزة خالد فوزي', 'student0018@edu.com', '01100000018', 5, 'Active'),
('student_0019', 'pass', 'Student', 'جنى محمود علي', 'student0019@edu.com', '01100000019', 5, 'Active'),
('student_0020', 'pass', 'Student', 'آدم أحمد حسن', 'student0020@edu.com', '01100000020', 6, 'Active');

-- ملاحظة: لتوليد 3000 طالب، يمكن استخدام Script Generator أو Loop
-- هذا مثال لـ 20 طالب فقط، يمكن تكرار النمط

-- إضافة Student Profiles
INSERT INTO student_profiles (user_id, parent_name, parent_phone, address, date_of_birth, enrollment_date, notes) 
SELECT user_id, 
       CONCAT('ولي أمر ', full_name), 
       CONCAT('0120000', LPAD(user_id, 4, '0')),
       'Cairo, Egypt',
       DATE_SUB(CURDATE(), INTERVAL (10 + (user_id % 20)) YEAR),
       '2026-02-01',
       'Placeholder student profile'
FROM users WHERE role = 'Student' LIMIT 20;

-- تسجيل الطلاب في المجموعات
INSERT INTO enrollments (student_id, group_id, enrollment_date, status, payment_status)
SELECT u.user_id, 
       (1 + (u.user_id % 10)) as group_id,
       '2026-02-01',
       'Active',
       CASE WHEN (u.user_id % 3 = 0) THEN 'Paid' ELSE 'Pending' END
FROM users u WHERE u.role = 'Student' LIMIT 20;

-- إضافة سجلات حضور عشوائية
INSERT INTO attendance (enrollment_id, session_date, status, notes, recorded_by)
SELECT e.enrollment_id,
       DATE_ADD('2026-02-01', INTERVAL (e.enrollment_id % 30) DAY),
       CASE (e.enrollment_id % 4)
           WHEN 0 THEN 'Present'
           WHEN 1 THEN 'Present'
           WHEN 2 THEN 'Late'
           ELSE 'Absent'
       END,
       'Auto-generated attendance',
       1
FROM enrollments e LIMIT 100;

-- إضافة سجلات مدفوعات
INSERT INTO payments (student_id, amount, payment_method, payment_date, transaction_type, collected_by, branch_id, notes)
SELECT u.user_id,
       (1000 + (u.user_id % 5) * 200) as amount,
       CASE (u.user_id % 3)
           WHEN 0 THEN 'Cash'
           WHEN 1 THEN 'Card'
           ELSE 'Bank Transfer'
       END,
       DATE_ADD('2026-02-01', INTERVAL (u.user_id % 20) DAY),
       'Tuition Fee',
       1,
       u.branch_id,
       'Placeholder payment'
FROM users u WHERE u.role = 'Student' LIMIT 20;
