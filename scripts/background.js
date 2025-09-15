import { getCourseContent } from "/scripts/brightspace.js";

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "fetchCourses") {
        getCourseContent(sender.tab.url).then(function(data) { // .then is waiting for promise to resolve. Its like await but for non-async functions
            sendResponse(data);
        });
        return true;
    }
});
