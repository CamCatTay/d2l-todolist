function getTimeTaken(startTime, endTime) {
    return (endTime - startTime).toFixed(2)/1000;
}

function getMondayOfCurrentWeek(date) {
    const day = date.getDay();
    const difference = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(date.setDate(difference));
}

function createAssignmentElement(assignment, course) { // passing entire course for now may only need the name though
    const assignmentContainer = document.createElement("a");
    assignmentContainer.id = "course-assignment-container";

    const assignmentName = document.createElement("div");
    assignmentName.textContent = assignment.name;
    assignmentContainer.appendChild(assignmentName);

    // holds the span elements for assignment data
    const assignmentDataContainer = document.createElement("div");
    assignmentContainer.appendChild(assignmentDataContainer);

    const timeDue = document.createElement("span");
    timeDue.id = "timeDue";
    timeDue.textContent = assignment.dueDate; // PLACEHOLDER: this should be time due not entire due date
    assignmentDataContainer.appendChild(timeDue);

    const courseName = document.createElement("span");
    courseName.id = "course-name";
    courseName.textContent = course.name;
    assignmentDataContainer.appendChild(courseName);

    console.log("Created assignment element for:", assignment.name);
    return assignmentContainer;
}

function initializeGUI(courseData) {
    const calendarContainer = document.getElementById("calendar-container");

    const currentDate = new Date();
    const mondayDate = getMondayOfCurrentWeek(new Date(currentDate));
    console.log("Monday of current week:", mondayDate);

    /* // test insert element functions
    const div = document.createElement("div");
    div.textContent = "base element";
    calendarContainer.appendChild(div);

    const div2 = document.createElement("div");
    div2.textContent = "im before the base element";
    calendarContainer.insertBefore(div2, div);

    const div3 = document.createElement("div");
    div3.textContent = "im after the base element";
    calendarContainer.appendChild(div3, div);
    */

    const testAssignment = createAssignmentElement(
        {name: "Test Assignment", dueDate: "2024-06-30 23:59" },
        {name: "Test Course"}
    )

    if (calendarContainer) {
        calendarContainer.appendChild(testAssignment);
    }
    
}

function updateGUI(courseData) {

}

window.addEventListener("load", () => {
    console.log("D2L-Todolist loaded")

    const startTime = performance.now();
    const COURSE_DATA_KEY = "courseData";
    const courseData = {};
    const oldCourseDataMap = new Map(); // {courseId, complete: false}
    const dateContainerMap = new Map(); // {date, dateContainer}

    // initialize GUI
    initializeGUI(courseData);
    

    // fetch new data first in case it is faster than storage retrieval
    // fetch  course data and update storage
    chrome.runtime.sendMessage({ action: "fetchCourses" }, function(response) {

        // save course data to storage
        chrome.storage.local.set({ courseData: response }, function() {
            Object.assign(courseData, response);
        });

        console.log("Fetched course data:", courseData);
        console.log("It took " + getTimeTaken(startTime, performance.now()) + "s to fetch course data");
    });

    // set courseData from storage if it exists
    chrome.storage.local.get([COURSE_DATA_KEY], function(result) {
        if (result.courseData && courseData.isEmpty !== false) {
            Object.assign(courseData, result.courseData);
            console.log("Course data from storage:", courseData);
            console.log("It took " + getTimeTaken(startTime, performance.now()) + "s to load stored course data");
        } else {
            //console.log("No course data found in storage.");
            // if check is not accurate
        }
    });

    // setup UI and create oldCourseDataMap

    // save course data before unloading/leaving the page (and periodically)

});

chrome.runtime.onMessage.addListener(function(request) {
    if (request.action === "openUrl") {
        window.open(request.url, '_blank');
    }
});