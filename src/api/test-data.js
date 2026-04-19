// test-data.js
// Provides static fake course data used during development to avoid hitting
// the live Brightspace API.

/**
 * @typedef {Object} BrightspaceItem
 * @property {string} OrgUnitId
 * @property {number} ItemId
 * @property {string} ItemName
 * @property {number} ItemType
 * @property {string} [ItemUrl]
 * @property {string} [StartDate]
 * @property {string} [EndDate]
 * @property {string} [DueDate]
 * @property {string} [DateCompleted]
 * @property {number} ActivityType
 * @property {boolean} IsExempt
 */

// Activity type IDs as defined by the Brightspace API
const ActivityType = Object.freeze({
    ASSIGNMENT: 3,
    QUIZ:       4,
    DISCUSSION: 5,
});

// D2L OrgUnit type ID that identifies a course section
const COURSE_ORG_UNIT_TYPE_ID = 3;

const FAKE_BASE_COURSE_ID   = 1001;
const FAKE_ITEMS_PER_COURSE = 15;
// Days ahead (from start of week) used when randomizing fake due dates
const FAKE_DATE_RANGE_DAYS  = 31;

const FAKE_COURSE_NAMES = [
    "Data Structures and Algorithms Section 01 Fall 2026",
    "Academic Writing and Communication Section 02 Fall 2026",
    "Calculus II Section 01 Fall 2026",
    "Introduction to Psychology Section 03 Fall 2026",
    "Modern World History Section 01 Fall 2026",
];

const FAKE_ASSIGNMENT_NAMES = [
    "Lab Report 1: Variables and Control Flow",
    "Essay Draft: Comparative Analysis",
    "Problem Set 3: Integration Techniques",
    "Research Proposal Outline",
    "Case Study: Cognitive Bias in Decision Making",
    "Lab Report 2: Sorting Algorithm Performance",
    "Annotated Bibliography",
    "Midterm Project: Data Visualization",
    "Reflection Journal Entry 2",
    "Group Project: Literature Review",
    "Assignment 4: Recursive Functions",
    "Final Essay: Argument and Counterargument",
];

const FAKE_QUIZ_NAMES = [
    "Quiz 1: Chapter 1-3 Review",
    "Quiz 2: Binary Trees",
    "Midterm Exam",
    "Quiz 3: Grammar and Syntax",
    "Quiz 4: Limits and Derivatives",
    "Chapter 5 Knowledge Check",
    "Weekly Quiz: Psychological Disorders",
    "Quiz 6: World War II Overview",
    "Final Exam Review Quiz",
    "Pop Quiz: Stack and Queue",
];

const FAKE_DISCUSSION_NAMES = [
    "Discussion: Ethical Implications of AI",
    "Week 2 Reflection: Course Themes",
    "Peer Review: Draft Exchange",
    "Discussion: Is history cyclical?",
    "Forum: Real-world Applications of Sorting",
    "Discussion: Nature vs. Nurture",
    "Weekly Forum: Current Events Response",
    "Discussion: Big O Notation in Practice",
    "Forum: Rhetorical Strategies in Media",
    "Discussion: Mental Health Stigma",
];

// Common due times used in academic settings
const FAKE_DUE_TIMES = [
    { hour: 23, minute: 59 },
    { hour: 23, minute: 59 },
    { hour: 23, minute: 59 },
    { hour: 11, minute: 59 },
    { hour: 17, minute: 0  },
    { hour: 8,  minute: 0  },
    { hour: 12, minute: 0  },
];

// Returns a random element from the given array.
function pick_random(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generates a single fake BrightspaceItem for testing
 * @param {number} item_id - Unique item ID
 * @param {string} course_id - Course ID
 * @param {number} [activity_type] - Optional activity type (see ActivityType enum)
 * @returns {BrightspaceItem} A fake BrightspaceItem
 */
function generate_fake_brightspace_item(item_id, course_id, activity_type = ActivityType.ASSIGNMENT) {
    // Random due date between start of this week and 30 days from now
    const today = new Date();
    const start_of_week = new Date(today);
    start_of_week.setDate(today.getDate() - today.getDay());
    const due_date = new Date(start_of_week);
    due_date.setDate(start_of_week.getDate() + Math.floor(Math.random() * (today.getDay() + FAKE_DATE_RANGE_DAYS)));

    const time = pick_random(FAKE_DUE_TIMES);
    due_date.setHours(time.hour, time.minute, 0, 0);

    const name_pool = activity_type === ActivityType.ASSIGNMENT ? FAKE_ASSIGNMENT_NAMES
                    : activity_type === ActivityType.QUIZ       ? FAKE_QUIZ_NAMES
                    : FAKE_DISCUSSION_NAMES;
    const name = pick_random(name_pool);

    return {
        OrgUnitId: course_id.toString(),
        ItemId: item_id,
        ItemName: name,
        ItemType: activity_type,
        ItemUrl: `https://example.brightspace.com/d2l/le/content/${course_id}/viewContent/${item_id}`,
        DueDate: due_date.toISOString(),
        ActivityType: activity_type,
        IsExempt: false
    };
}

/**
 * Generates multiple fake BrightspaceItems for testing
 * @param {number} count - Number of items to generate
 * @param {string} course_id - Course ID
 * @returns {BrightspaceItem[]} Array of fake BrightspaceItems
 */
function generate_fake_brightspace_items(count, course_id) {
    const items = [];
    const ACTIVITY_TYPES = [ActivityType.ASSIGNMENT, ActivityType.QUIZ, ActivityType.DISCUSSION];

    for (let i = 1; i <= count; i++) {
        const activity_type = pick_random(ACTIVITY_TYPES);
        items.push(generate_fake_brightspace_item(i, course_id, activity_type));
    }

    return items;
}

/**
 * Generates fake courses and items for testing purposes
 * @param {Function} map_data - The map_data function from brightspace.js
 * @returns {Object} CourseMap with fake data
 */
export async function get_test_course_content(map_data) {
    const fake_courses = FAKE_COURSE_NAMES.map((name, i) => ({
        OrgUnit: {
            Id: FAKE_BASE_COURSE_ID + i,
            Name: name,
            Type: { Id: COURSE_ORG_UNIT_TYPE_ID }
        },
        HomeUrl: `https://example.brightspace.com/d2l/home/${FAKE_BASE_COURSE_ID + i}`
    }));

    const fake_items = [];
    fake_courses.forEach(course => {
        const course_items = generate_fake_brightspace_items(FAKE_ITEMS_PER_COURSE, course.OrgUnit.Id);
        fake_items.push(...course_items);
    });

    const course_map = await map_data(fake_courses, fake_items);

    console.log("Using TEST MODE - fake course data loaded");
    return course_map;
}
