/**
 * Messaging Core Engine (WhatsApp & Communication)
 * Handles automated and manual messaging for EduMaster Pro
 */
window.MessagingCore = {
    _templates: {
        'ATTENDANCE_PRESENT': 'تنسيق الحضور 🎓\nنحيطكم علماً بأن ابننا البطل {name} قد حضر اليوم في موعد مجموعة {group} في تمام الساعة {time}. نتمنى له التوفيق. ✨',
        'ATTENDANCE_ABSENT': 'تنسيق الغياب ⚠️\nنود إبلاغكم بأن الطالب {name} لم يحضر اليوم موعد مجموعة {group} ({time}). يرجى التأكد من سبب الغياب والمتابعة معنا. 📞',
        'PAYMENT_RECEIPT': 'إيصال دفع رقمي 🧾\nتم استلام مبلغ {amount} ج.م من الطالب {name} مقابل {category} بتاريخ {date}. شكراً لتعاونكم معنا. 🌸',
        'STUDENT_REGISTRATION': 'مرحباً بك في أسرتنا! ✨\nتم تسجيل الطالب {name} بنجاح في EduMaster Pro.\nكود الطالب الخاص بك: {code}\nنسعد جداً بانضمامكم إلينا! ❤️',
        'PARENT_PORTAL_LINK': 'عزيزي ولي الأمر 👋\nيمكنكم الآن متابعة (حضور، درجات، ومدفوعات) ابننا {name} لحظة بلحظة من خلال بوابة المتابعة الذكية الخاصة بنا.\n\n🔗 رابط المتابعة: {url}\n🔑 كود الدخول الخاص بكم: {code}\n\nنحن نهتم بمستقبل أبنائكم! ✨'
    },

    notifyPortalLink(student) {
        // In a real scenario, this would be a hosted URL. For local, we use a placeholder or the file name if it's local.
        const portalUrl = "https://edumaster-pro.github.io/portal"; // مثال لرابط مستقبلي
        const msg = this.generateMessage('PARENT_PORTAL_LINK', {
            name: student.name,
            url: portalUrl,
            code: student.code || student.id
        });
        const phone = student.parent_phone || student.phone;
        if (phone) this.sendWhatsApp(phone, msg);
    },

    sendWhatsApp(phone, message) {
        if (!phone) {
            if (window.Toast) Toast.show('رقم الهاتف غير مسجل', 'error');
            return false;
        }
        const formattedPhone = this.formatPhone(phone);
        const encodedMsg = encodeURIComponent(message);

        // 🚀 استخدام رابط الويب المباشر لضمان فتح الحساب المسجل في المتصفح
        const url = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMsg}`;

        window.open(url, '_blank');
        return true;
    },

    formatPhone(phone) {
        let clean = phone.toString().replace(/\D/g, '');
        if (clean.startsWith('01') && clean.length === 11) clean = '2' + clean;
        else if (clean.startsWith('1') && clean.length === 10) clean = '20' + clean;
        return clean;
    },

    generateMessage(templateKey, data) {
        let msg = this._templates[templateKey] || '';
        Object.entries(data).forEach(([key, value]) => {
            msg = msg.replace(new RegExp(`{${key}}`, 'g'), value);
        });
        return msg;
    },

    notifyAttendance(student, groupName, status, time) {
        const type = status === 'absent' ? 'ATTENDANCE_ABSENT' : 'ATTENDANCE_PRESENT';
        const msg = this.generateMessage(type, {
            name: student.name,
            group: groupName,
            time: time
        });
        const phone = student.parent_phone || student.phone; // نفضل رقم ولي الأمر أولاً
        if (phone) this.sendWhatsApp(phone, msg);
    },

    notifyRegistration(student) {
        const msg = this.generateMessage('STUDENT_REGISTRATION', {
            name: student.name,
            code: student.code || student.id
        });
        const phone = student.parent_phone || student.phone;
        if (phone) this.sendWhatsApp(phone, msg);
    },

    notifyPayment(student, amount, category) {
        const msg = this.generateMessage('PAYMENT_RECEIPT', {
            name: student.name,
            amount: amount,
            category: category,
            date: new Date().toLocaleDateString('ar-EG')
        });
        const phone = student.parent_phone || student.phone;
        if (phone) this.sendWhatsApp(phone, msg);
    }
};

console.log('📱 Messaging Core Active: WhatsApp Integration Ready');
