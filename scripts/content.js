console.log('Content script loaded');

window.addEventListener("load", function() {
    getBrightspaceCourses();
}, false); 

function getBaseURL() {
    return window.location.protocol + "//" + window.location.host;
}

// gets all pages of a paginated request from D2L Brightspace and returns combined data
async function getBrightspaceData(url) {

    const response = await fetch(url);
    const data = await response.json();

    if ("Next" in data && data && data.Next) { // check if there is next page for course data
        return data.Object.concat(await getBrightspaceData(data.Next));
    }
    else if ("PagingInfo" in data && data.PagingInfo && data.PagingInfo.HasMoreItems) { // check if there is next page for enrollment data
        const currentPage = new URL(url);
        currentPage.searchParams.set("bookmark", response.PagingInfo.Bookmark); //append ?bookmark=... for next page

        const nextPageItems = await getBrightspaceData(currentPage.toString());
        return data.Items.concat(nextPageItems);
    }
    return "Items" in data ? data.Items : data.Object; // if data has "Items" then return Items else return Object
}

async function getBrightspaceCourses() {

    function isValidCourse(course) {
        return course.Access.CanAccess && course.Access.IsActive && course.OrgUnit.Type.Id === 3;
    }

    try {
        let baseURL = getBaseURL();
        let coursesURL = baseURL + "/d2l/api/lp/1.43/enrollments/myenrollments/"
        const allCourses = await getBrightspaceData(coursesURL);
        const courses = allCourses.filter(isValidCourse);

        console.log(courses);
        
    } catch (error) {
        console.error("Error fetching JSON:", error);
    }
}