/**
 * Logic for managing Academics (Courses, Groups)
 */
export class CourseManager {
    constructor(dbAdapter) {
        this.db = dbAdapter;
    }

    /**
     * Create a Course
     * @param {Object} courseData - { name, description, branchId, basePrice, level }
     */
    async createCourse(courseData) {
        // Validation Logic
        if (!courseData.name || !courseData.branchId) {
            return { success: false, error: 'Missing required course fields' };
        }

        console.log(`[CourseManager] Creating course: ${courseData.name}`);
        const courseId = await this.db.insertCourse(courseData);
        return { success: true, courseId };
    }

    /**
     * Create a Group (Class Instance)
     * @param {Object} groupData - { courseId, branchId, teacherId, schedule, startDate, maxStudents }
     */
    async createGroup(groupData) {
        // Business Rule: Check teacher availability (Placeholder)
        const isTeacherAvail = await this.db.checkTeacherAvailability(groupData.teacherId, groupData.schedule);
        if (!isTeacherAvail) {
            console.error('[CourseManager] Teacher conflict.');
            return { success: false, error: 'Teacher not available at this time' };
        }

        console.log(`[CourseManager] Creating group ${groupData.groupName}...`);
        const groupId = await this.db.insertGroup(groupData);

        // Return full group details
        return await this.db.findGroupById(groupId);
    }

    /**
     * Enroll Student in Group
     * @param {number} studentId 
     * @param {number} groupId 
     */
    async enrollStudent(studentId, groupId) {
        // Check capacity
        const group = await this.db.findGroupById(groupId);
        if (group.currentEnrollment >= group.maxStudents) {
            return { success: false, error: 'Group is full' };
        }

        console.log(`[Enrollment] Enrolling student ${studentId} in group ${groupId}`);
        const enrollment = await this.db.performEnrollment(studentId, groupId);

        return { success: true, enrollmentId: enrollment.id };
    }
}
