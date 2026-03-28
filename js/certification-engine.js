/**
 * 🎓 EduMaster Pro - Certification & Exam Engine
 * 
 * Manages exams entry and PDF certificate generation with QR verification.
 */

window.CertificationEngine = {
    /**
     * Types of Certificates
     */
    TYPES: {
        EXAM: 'EXAM_SUCCESS',
        MONTHLY: 'STUDENT_OF_THE_MONTH',
        COMPLETION: 'COURSE_COMPLETION'
    },

    /**

     * Generate a unique Certificate ID
     */
    generateCertId(studentId, examId) {
        return `CERT-${studentId}-${examId}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    },

    /**
     * Save/Issue a certificate to a student
     */
    issueCertificate(studentId, examName, grade, totalMark, type = 'EXAM_SUCCESS', orientation = 'landscape') {
        const certs = Storage.get('issued_certificates') || [];
        const certId = this.generateCertId(studentId, Date.now());

        const newCert = {
            id: certId,
            studentId,
            examName,
            grade,
            totalMark,
            type,
            orientation, // 'landscape' or 'portrait'
            date: new Date().toISOString(),
            status: 'Active'
        };

        certs.push(newCert);
        Storage.save('issued_certificates', certs);
        return newCert;
    },

    /**
     * Auto-detect and award "Student of the Month"
     */
    autoAwardStudentOfTheMonth(month, year) {
        const students = Storage.get('students') || [];
        const attendance = Storage.get('attendance_records') || [];
        const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

        const monthAttendance = attendance.filter(a => a.date.startsWith(monthStr));
        const winners = [];

        students.forEach(student => {
            const studentAtt = monthAttendance.filter(a => a.student_id == student.id);
            if (studentAtt.length < 8) return; // Need at least some attendance records

            const presentCount = studentAtt.filter(a => a.status === 'present').length;
            const attendanceRate = (presentCount / studentAtt.length) * 100;

            if (attendanceRate >= 95) {
                const alreadyAwarded = (Storage.get('issued_certificates') || [])
                    .find(c => c.studentId == student.id && c.type === this.TYPES.MONTHLY && c.examName.includes(monthStr));

                if (!alreadyAwarded) {
                    const cert = this.issueCertificate(
                        student.id,
                        `طالب الشهر المتميز (${monthStr})`,
                        100, 100,
                        this.TYPES.MONTHLY
                    );
                    winners.push({ student, cert });
                }
            }
        });

        return winners;
    },

    /**
     * Open a printable Certificate window
     */
    viewCertificate(certId) {
        const certs = Storage.get('issued_certificates') || [];
        const cert = certs.find(c => c.id === certId);
        if (!cert) return alert('الشهادة غير موجودة');

        const students = Storage.get('students') || [];
        const student = students.find(s => s.id == cert.studentId);
        if (!student) return alert('بيانات الطالب غير موجودة');

        const verifyUrl = `${window.location.origin}/verify.html?certId=${cert.id}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verifyUrl)}`;

        const orientation = cert.orientation || 'landscape';
        const isPortrait = orientation === 'portrait';

        const printWin = window.open('', '_blank');
        printWin.document.write(`
            <html>
            <head>
                <title>شهادة تقدير - ${student.name}</title>
                <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap" rel="stylesheet">
                <style>
                    @page { size: A4 ${orientation}; margin: 0; }
                    body { margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; height: 100vh; background: #525659; font-family: 'Tajawal', sans-serif; }
                    
                    .certificate-paper {
                        width: ${isPortrait ? '210mm' : '297mm'}; 
                        height: ${isPortrait ? '297mm' : '210mm'}; 
                        background: #fff; padding: 30px; position: relative;
                        box-shadow: 0 0 50px rgba(0,0,0,0.5); border: 20px solid #1a3a63; box-sizing: border-box;
                        background-image: 
                            linear-gradient(rgba(26, 58, 99, 0.05) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(26, 58, 99, 0.05) 1px, transparent 1px);
                        background-size: 20px 20px;
                        display: flex; flex-direction: column;
                    }

                    .border-inner { 
                        border: 2px solid #f59e0b; flex: 1; border-radius: 5px; padding: 30px; 
                        text-align: center; position: relative; display: flex; flex-direction: column; justify-content: space-between;
                        box-sizing: border-box; overflow: hidden;
                    }

                    .header-logo { font-size: ${isPortrait ? '2rem' : '2.2rem'}; font-weight: 900; color: #1a3a63; }
                    .cert-title { font-size: ${isPortrait ? '3rem' : '3.8rem'}; color: #f59e0b; font-weight: 900; text-transform: uppercase; margin: 15px 0; }
                    .cert-subtitle { font-size: 1.2rem; color: #64748b; margin-bottom: 15px; }
                    .student-name { font-size: ${isPortrait ? '2.8rem' : '3.2rem'}; font-weight: 900; color: #1a3a63; border-bottom: 3px solid #f59e0b; display: inline-block; padding: 5px 30px; margin-bottom: 20px; }
                    .cert-text { font-size: 1.25rem; color: #1e293b; line-height: 1.6; max-width: 85%; margin: 0 auto; }
                    
                    .footer-area { display: flex; justify-content: space-between; align-items: flex-end; width: 100%; margin-top: auto; padding-top: 20px; }
                    .signature-box { border-top: 2px solid #1a3a63; padding-top: 10px; width: 180px; font-weight: 900; font-size: 0.9rem; }
                    .qr-box { text-align: center; }
                    .qr-box img { width: 85px; height: 85px; border: 1px solid #ddd; padding: 5px; background: #fff; }
                    .cert-id { font-size: 0.7rem; color: #94a3b8; margin-top: 5px; font-family: monospace; }

                    @media print {
                        body { background: none; }
                        .certificate-paper { box-shadow: none; border-width: 15px; }
                    }
                </style>
            </head>
            <body>
                <div class="certificate-paper">
                    <div class="border-inner">
                        <div class="header-logo">EduMaster Pro</div>
                        <div>
                            <div class="cert-title">${cert.type === this.TYPES.MONTHLY ? 'جائزة طالب الشهر' : 'شهادة تقدير'}</div>
                            <div class="cert-subtitle">${cert.type === this.TYPES.MONTHLY ? 'تقديراً للانضباط والاجتهاد، تمنح إدارة المركز هذه الجائزة للطالب' : 'تمنح إدارة المركز هذه الشهادة للطالب'}</div>
                            <div class="student-name">${student.name}</div>
                            <div class="cert-text">
                                ${cert.type === this.TYPES.MONTHLY ?
                `وذلك لتفوقه الأخلاقي والعلمي والتزامه الكامل بمواعيد الحصص بنسبة <b>(100%)</b> خلال شهر <b>${cert.examName.match(/\((.*?)\)/)?.[1] || 'الحالي'}</b>.` :
                `وذلك لتفوقه الباهر في اختبار <b>(${cert.examName})</b><br>حيث حصل على درجة <b>(${cert.grade} من ${cert.totalMark})</b> بنسبة نجاح <b>${Math.round((cert.grade / cert.totalMark) * 100)}%</b>.`
            }<br>متمنين له دوام التوفيق والنجاح المستمر.
                            </div>
                        </div>
                        
                        <div class="footer-area">
                            <div class="signature-box">ختم وإدارة المركز</div>
                            <div class="qr-box">
                                <img src="${qrUrl}">
                                <div class="cert-id">${cert.id}</div>
                                <div style="font-size:0.5rem; color:#64748b; margin-top:2px;">امسح للتحقق من الصحة</div>
                            </div>
                            <div class="signature-box" style="text-align:left;">تاريخ الإصدار<br>${new Date(cert.date).toLocaleDateString('ar-EG')}</div>
                        </div>
                    </div>
                </div>
                <script>setTimeout(() => { window.print(); }, 1000);<\/script>
            </body>
            </html>
        `);
        printWin.document.close();
    }
};
