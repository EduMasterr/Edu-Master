# EduMaster Pro - Core Logic System
**Phase 3: Core Logic Code**
**Date:** 2026-02-11

This directory contains the core business logic (backend) for EduMaster Pro.
The system is designed with a **Modular Architecture**, where each major function (Auth, Finance, Courses...) is handled by a dedicated manager class.

## Directory Structure
- `auth-manager.js`: Handles user login, roles (RBAC), and session tokens.
- `branch-manager.js`: Manages the 8 branches, retrieves stats, and handles multi-branch logic.
- `course-manager.js`: Logic for creating courses, groups, and enrolling students with capacity checks.
- `attendance-manager.js`: Records daily attendance, validates enrollment, and triggers absence alerts.
- `finance-manager.js`: Processes payments, tracks student balances, and generates revenue data.
- `report-generator.js`: Aggregates data for student and branch reports (JSON/PDF placeholders).
- `main.js`: The central entry point that initializes all managers and injects the database dependency.

## Usage Example (Pseudo-code)

```javascript
import { system } from './core/main.js';

// 1. Admin Login
const adminSession = await system.auth.login('superadmin', 'password123');
if (adminSession.success) {
    console.log('Welcome ' + adminSession.user.name);
}

// 2. Create a Course
const newCourse = await system.course.createCourse({
    name: 'English Level 1',
    branchId: 1,
    basePrice: 1200
});

// 3. Mark Attendance
await system.attendance.markAttendance({
    enrollmentId: 101,
    sessionDate: '2026-02-12',
    status: 'Present',
    notes: 'On time'
});

// 4. Collect Payment
const receipt = await system.finance.processPayment({
    studentId: 505,
    amount: 600,
    paymentMethod: 'Cash'
});
```

## Next Steps
This core logic is ready to be connected to Phase 4 (Frontend). The `main.js` file can be imported by the UI or wrapped in an API server (Express.js) later.
