console.log('Content script loaded');

window.addEventListener("load", function() {
    //getBrightspaceCourses();
    getCourseContent();
}, false); 

function getBaseURL() {
    return window.location.protocol + "//" + window.location.host;
}

// gets all pages of a paginated request from D2L Brightspace and returns combined data
async function getBrightspaceData(url) {

    const response = await fetch(url);
    const data = await response.json();

    if ("Next" in data) { // check if there is next page for course data
        if (!data.Next) {
            return data.Objects;
        } else {
            return data.Objects.concat(await getBrightspaceData(data.Next));
        }
    }
    else if ("PagingInfo" in data && data.PagingInfo && data.PagingInfo.HasMoreItems) { // check if there is next page for enrollment data
        const currentPage = new URL(url);
        currentPage.searchParams.set("bookmark", response.PagingInfo.Bookmark); //append ?bookmark=... for next page

        const nextPageItems = await getBrightspaceData(currentPage.toString());
        return data.Items.concat(nextPageItems);
    }
    return "Items" in data ? data.Items : data.Object; // if data has "Items" then return Items else return Object
}

function isValidCourse(course) {
    return course.Access.CanAccess && course.Access.IsActive && course.OrgUnit.Type.Id === 3;
}

async function getBrightspaceCourses() {

    try {
        let baseURL = getBaseURL();
        let coursesURL = baseURL + "/d2l/api/lp/1.43/enrollments/myenrollments/"
        const allCourses = await getBrightspaceData(coursesURL);
        const courses = allCourses.filter(isValidCourse);

        console.log(courses);
        return courses;
        
    } catch (error) {
        console.error("Error fetching JSON:", error);
    }
}

// gets the course ID of the given courses
async function getCourseIDs(courses) {
    const ids = [];
    courses.forEach(function(course) {
        ids.push(getCourseID(course));
    });
    return ids;
}

function getCourseID(courseData) {
    return courseData.OrgUnit.Id;
}

// gets the content section of the courses
async function getCourseContent () {

    try {
        let baseURL = getBaseURL();
        const courses = await getBrightspaceCourses();
        const courseIds = await getCourseIDs(courses);
        const courseId = courseIds[0]; // for testing, just get the first course

        const courseIdsCSV = courseIds.join(','); // joins the Ids into a CSV for the URL

        let assignmentURL = baseURL + "/d2l/api/le/1.67/content/myItems/?startDateTime=null&endDateTime=null&orgUnitIdsCSV=" + courseIdsCSV;
        
        courseContent = await getBrightspaceData(assignmentURL);

        console.log(courseContent);

        return courseContent;
    } catch (error) {
        console.error("Error: ", error);
    }

}