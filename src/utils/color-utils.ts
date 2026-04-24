// Assigns and retrieves consistent hex colors for courses using a fixed color pool.

// Color pool as direct hex values for easy fine-tuning
export const COLOR_POOL = [
    "#e05555",  // Red
    "#e07c2e",  // Orange
    "#c9a800",  // Yellow
    "#3aaa4e",  // Green
    "#4a6ee0",  // Blue
    "#d94f9e",  // Pink
    "#8c52d4",  // Purple
];

// { courseName: colorHex } - assigned lexicographically
let courseColorMap: Record<string, string> = {};

export function getColorFromPool(index: number): string {
    return COLOR_POOL[index % COLOR_POOL.length];
}

export function ensureCourseColorsAssigned(courseData: Record<string, { name: string }>): void {
    const allCourseNames = new Set<string>();
    Object.keys(courseData).forEach((courseId) => {
        allCourseNames.add(courseData[courseId].name);
    });

    const sortedNames = Array.from(allCourseNames).sort();
    sortedNames.forEach((name, index) => {
        if (!courseColorMap[name]) {
            courseColorMap[name] = getColorFromPool(index);
        }
    });
}

export function getCourseColor(courseName: string): string {
    return courseColorMap[courseName] || "#808080";
}

// Resets the internal color map — only used in tests to ensure isolation between test cases.
export function _resetColorMap(): void {
    courseColorMap = {};
}
