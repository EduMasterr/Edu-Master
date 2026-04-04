# EduMaster Pro - نظام إدارة المعاهد التعليمية

## 🎯 نظرة عامة
نظام متكامل لإدارة المعاهد التعليمية يدعم 8 فروع مع إمكانية التوسع. النظام مصمم بشكل Modular ويدعم العمليات الهجينة (Hybrid: In-Person + Online).

## 📁 هيكل المشروع

```
Edu-Master-Pro/
├── index.html                  # صفحة التوجيه الرئيسية
├── README.md                   # هذا الملف
├── docs/                       # الوثائق والتقارير
│   ├── light-mode/             # وثائق الوضع الفاتح
│   ├── SRS_Phase1.md           # متطلبات النظام
│   ├── Phase2_Report.md        # تقرير المرحلة الثانية
│   ├── DASHBOARD_PHASE2_REPORT.md # تقرير الداشبورد
│   └── Project_Final_Report.md # التقرير النهائي
│
├── frontend/                   # واجهات المستخدم
│   ├── login.html             # صفحة تسجيل الدخول ✅
│   ├── dashboard.html         # لوحة التحكم الرئيسية ✅
│   ├── branches.html          # إدارة الفروع ✅
│   ├── students.html          # إدارة الطلاب ✅
│   ├── attendance.html        # تسجيل الحضور ✅
│   ├── styles/                # ملفات التنسيق
│   └── js/                    # منطق الواجهة الأمامية (Controllers)
│
├── core/                       # منطق النظام الأساسي (Backend Logic)
│   ├── main.js                # نقطة الدخول الرئيسية (Updated Phase 2)
│   ├── auth-manager.js        # إدارة المصادقة والصلاحيات
│   ├── branch-manager.js      # إدارة الفروع
│   ├── course-manager.js      # إدارة الكورسات والمجموعات
│   ├── attendance-manager.js  # إدارة الحضور والغياب
│   ├── finance-manager.js     # إدارة المدفوعات والمالية
│   ├── report-generator.js    # توليد التقارير
│   ├── backup-system.js       # نظام النسخ الاحتياطي
│   ├── student-manager.js     # 🆕 Phase 2 - إدارة الطلاب الكاملة
│   └── mock-db.js             # 🆕 Phase 2 - محاكي قاعدة البيانات
│
├── database/                   # قاعدة البيانات
│   ├── schema.sql             # هيكل قاعدة البيانات
│   ├── seed_data.sql          # بيانات افتراضية أساسية
│   └── extended_seed_data.sql # 🆕 Phase 2 - بيانات موسعة (3000 طالب)
│
├── docs/                       # الوثائق
│   ├── SRS_Phase1.md          # وثيقة متطلبات النظام
│   ├── Use_Cases_Phase1.md    # حالات الاستخدام
│   ├── ER_Diagram_Phase2.md   # مخطط العلاقات
│   ├── Phase3_Report.md       # تقرير المرحلة الثالثة
│   └── Phase2_Report.md       # 🆕 تقرير المرحلة الثانية
│
├── reports/                    # التقارير المولدة
│   └── system_report_Feb2026.html
│
└── backups/                    # النسخ الاحتياطية (Placeholder)
```

---

## 🔐 بيانات الدخول

- **اسم المستخدم:** `admin`
- **كلمة المرور:** `admin`

---

## 🚀 كيفية التشغيل

1. افتح ملف `index.html` في المتصفح
2. سيتم توجيهك تلقائياً لصفحة تسجيل الدخول
3. أدخل بيانات الدخول أعلاه
4. استكشف النظام من خلال القوائم الجانبية

---

## ✨ الميزات الحالية

### Phase 1 (Completed)
✅ نظام تسجيل دخول آمن  
✅ لوحة تحكم شاملة بالإحصائيات  
✅ إدارة 8 فروع  
✅ تسجيل الحضور والغياب  
✅ تقارير مالية وإدارية  

### Phase 2 (Completed) 🆕
✅ **إدارة الطلاب الكاملة (Full CRUD)**
  - إضافة طالب جديد
  - تعديل بيانات الطالب
  - حذف طالب (Soft Delete)
  - بحث وفلترة متقدمة
  - تصدير البيانات (CSV/Excel)

✅ **قاعدة بيانات موسعة**
  - 50 طالب نموذجي (قابل للتوسع لـ 3000)
  - 10 مدرسين
  - 20 كورس
  - 10 مجموعات دراسية

✅ **Validation Layer**
  - فحص البريد الإلكتروني
  - فحص رقم الهاتف
  - فحص تفرد اسم المستخدم

✅ **Dynamic Frontend**
  - تحديث تلقائي للجداول
  - Event Listeners نشطة
  - Real-time Search

---

## 📊 الإحصائيات

| المكون | العدد | الحالة |
|--------|-------|--------|
| الفروع | 8 | ✅ Active |
| الطلاب (Placeholder) | 50 | ✅ Ready |
| المدرسين | 10 | ✅ Ready |
| الكورسات | 20 | ✅ Ready |
| المجموعات | 10 | ✅ Active |
| Core Logic Files | 9 | ✅ Complete |
| Frontend Pages | 5 | ✅ Complete |

---

## 🛠️ التقنيات المستخدمة

- **Frontend**: HTML5, CSS3 (Dark Mode), Vanilla JavaScript (ES6 Modules)
- **Backend Logic**: JavaScript (Modular Architecture)
- **Database**: SQL (MySQL/PostgreSQL Compatible)
- **Mock DB**: In-Memory JavaScript Objects
- **Icons**: Font Awesome 6.4
- **Fonts**: Tajawal (Arabic), Inter (English)

---

## 📝 الحالة

**النظام جاهز كنموذج أولي احترافي (Professional Prototype)** مع:
- ✅ بيانات افتراضية (Placeholders) جاهزة
- ✅ Core Logic كامل
- ✅ Frontend تفاعلي
- ✅ قابل للتوسع والربط بقاعدة بيانات حقيقية

---

## 🔜 الخطوات القادمة (Phase 3)

1. Modal Forms لإضافة/تعديل الطلاب
2. ربط بقاعدة بيانات حقيقية (MySQL/PostgreSQL)
3. تقارير PDF متقدمة
4. بوابة أولياء الأمور
5. نظام الإشعارات (SMS/WhatsApp)
6. لوحة تحكم المدرسين

---

## 📞 الدعم

للاستفسارات والدعم الفني، يرجى مراجعة الوثائق في مجلد `docs/`

