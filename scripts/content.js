window.addEventListener("load", () => {
    chrome.runtime.sendMessage({ action: "fetchCourses" }, function(response) {
        console.log("Course content:", response);
    });
});
