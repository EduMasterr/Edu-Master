# ER Diagram - EduMaster Pro
**المرحلة:** 2 (التحليل وتصميم قاعدة البيانات)
**التاريخ:** 2026-02-11

---

## المخطط الكياني العلائقي (Entity-Relationship Diagram)

Below is a textual representation of the Entities and their Relationships using Mermaid syntax, visualized for clarity.

```mermaid
erDiagram
    BRANCH ||--o{ USER : "employs/manages"
    BRANCH ||--o{ COURSE : "offers"
    BRANCH ||--o{ GROUP : "hosts"
    BRANCH ||--o{ PAYMENT : "collects"

    USER {
        int user_id PK
        string username
        string password_hash
        string full_name
        string email
        string phone
        string role "Admin, BranchAdmin, Teacher, Employee, Parent, Student"
        int branch_id FK "Nullable for SuperAdmin"
        date created_at
        boolean is_active
    }

    STUDENT_PROFILE {
        int student_id PK
        int user_id FK
        int parent_id FK
        date birth_date
        string grade_level
        string school_name
    }

    PARENT_PROFILE {
        int parent_id PK
        int user_id FK
        string national_id
        string address
    }
    
    TEACHER_PROFILE {
        int teacher_id PK
        int user_id FK
        string specialization
        decimal hourly_rate
    }

    COURSE {
        int course_id PK
        string name
        string description
        string level
        decimal base_price
        int branch_id FK
    }

    GROUP {
        int group_id PK
        int course_id FK
        int teacher_id FK
        string group_name
        string schedule "Mon,Wed 4-6PM"
        date start_date
        date end_date
        string status "Active, Completed, Cancelled"
    }

    ENROLLMENT {
        int enrollment_id PK
        int student_id FK
        int group_id FK
        date enrollment_date
        decimal final_price
        string status "Active, Dropped, Completed"
    }

    ATTENDANCE {
        int attendance_id PK
        int enrollment_id FK
        date session_date
        string status "Present, Absent, Late, Excused"
        string notes
    }

    PAYMENT {
        int payment_id PK
        int student_id FK
        decimal amount
        date payment_date
        string payment_method "Cash, Visa, Transfer"
        string transaction_type "Tuition, Book Fee, Registration"
        int branch_id FK
        string notes
    }

    REPORT {
        int report_id PK
        string report_type
        date generated_date
        string file_path
        int generated_by FK
    }

    %% Relationships
    USER ||--o| STUDENT_PROFILE : "is a"
    USER ||--o| PARENT_PROFILE : "is a"
    USER ||--o| TEACHER_PROFILE : "is a"
    
    PARENT_PROFILE ||--o{ STUDENT_PROFILE : "parent of"
    
    COURSE ||--o{ GROUP : "has instances"
    TEACHER_PROFILE ||--o{ GROUP : "teaches"
    
    STUDENT_PROFILE ||--o{ ENROLLMENT : "enrolls in"
    GROUP ||--o{ ENROLLMENT : "contains"
    
    ENROLLMENT ||--o{ ATTENDANCE : "tracks"
    
    STUDENT_PROFILE ||--o{ PAYMENT : "pays"
    BRANCH ||--o{ PAYMENT : "records"
```

---

## تفاصيل الجداول (Table Details)

### 1. `users` (Central Auth & Basic Info)
- **الغرض:** تخزين بيانات الدخول الأساسية لجميع المستخدمين لتسهيل عملية الـ Authentication.
- **الأعمدة:** `user_id`, `username`, `password_hash`, `full_name`, `email`, `phone`, `role`, `branch_id`, `is_active`.

### 2. `branches`
- **الغرض:** تخزين بيانات الفروع الـ 8 (أو أكثر مستقبلاً).
- **الأعمدة:** `branch_id`, `name`, `location`, `manager_name`, `contact_phone`.

### 3. `student_profiles` & `parent_profiles` & `teacher_profiles`
- **الغرض:** تمديد جدول المستخدمين ببيانات خاصة بكل دور (Normalization).
- **العلاقة:** One-to-One مع جدول `users`.

### 4. `courses` & `groups`
- **الغرض:** إدارة المحتوى التعليمي. الكورس هو المادة العلمية (مثل: انجليزي مستوى 1)، والمجموعة هي الفصل الدراسي الفعلي (Group A - السبت والاثنين).
- **الأعمدة:** `course_id`, `name`, `price` | `group_id`, `schedule`, `start_date`.

### 5. `enrollments`
- **الغرض:** ربط الطالب بالمجموعة (Enrollment).
- **الأعمدة:** `enrollment_id`, `student_id`, `group_id`, `status`.

### 6. `attendance`
- **الغرض:** تسجيل الحضور لكل طالب في كل حصة.
- **الأعمدة:** `attendance_id`, `enrollment_id`, `date`, `status` (Present/Absent).

### 7. `payments`
- **الغرض:** تتبع المعاملات المالية.
- **الأعمدة:** `payment_id`, `student_id`, `amount`, `date`, `type`.
