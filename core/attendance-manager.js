/**
 * Attendance statuses.
 */
export const ATTENDANCE_STATUS = {
    PRESENT: 'Present',
    ABSENT: 'Absent',
    LATE: 'Late',
    EXCUSED: 'Excused'
};

/**
 * Attendance Logic Core
 */
export class AttendanceManager {
    constructor(dbAdapter) {
        this.db = dbAdapter;
    }

    /**
     * Mark attendance for a specific session (group + date + student)
     * @param {Object} data - { enrollmentId, sessionDate, status, notes }
     */
    async markAttendance(data, recordedBy) {
        console.log(`[Attendance] Marking ${data.status} for enrollment ${data.enrollmentId}`);

        // Validation
        if (!Object.values(ATTENDANCE_STATUS).includes(data.status)) {
            console.error('[Attendance] Invalid status.');
            return { error: 'Invalid attendance status' };
        }

        // Logic: Check if student is active in group
        const enrollment = await this.db.getEnrollmentById(data.enrollmentId);
        if (!enrollment || enrollment.status !== 'Active') {
            console.error('[Attendance] Student is not active in this group.');
            return { error: 'Student enrollment invalid' };
        }

        // Save
        const record = await this.db.saveAttendance(data, recordedBy);

        // Alert logic (Placeholder)
        if (data.status === ATTENDANCE_STATUS.ABSENT) {
            this._sendAbsenceAlert(enrollment.studentId);
        }

        return record;
    }

    /**
     * Get attendance report for a specific group in a date range
     */
    async getGroupAttendance(groupId, startDate, endDate) {
        console.log(`[Attendance] Fetching attendance for Group ${groupId}`);
        return await this.db.attendanceQuery({ groupId, startDate, endDate });
    }

    /**
     * Get individual student attendance
     */
    async getStudentAttendance(studentId) {
        console.log(`[Attendance] Fetching attendance for Student ${studentId}`);
        return await this.db.attendanceQuery({ studentId });
    }

    /**
     * Placeholder for SMS/WhatsApp alert
     */
    _sendAbsenceAlert(studentId) {
        console.log(`[Alert] Sending absence notification to parent of student ${studentId}...`);
    }
}
