function waitForRosterContent(callback) {
    const observer = new MutationObserver((mutations, obs) => {
        if (document.getElementById("rosterContent")) {
            obs.disconnect();
            callback();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // this fixes what i think is a timing issue
    (function () {
        const element = document.createElement("div");
        document.body.appendChild(element);
        element.remove();
    })();
}

window.addEventListener("message", (event) => {
    if (
        event.source !== window ||
        !event.data ||
        event.data.type !== "csrfToken"
    )
        return;
    localStorage.setItem("csrfToken", event.data.token);
});

function injectScript(file) {
    const script = document.createElement("script");
    script.id = "injectedScript";
    script.setAttribute("type", "text/javascript");
    script.setAttribute("src", file);
    document.body.appendChild(script);
}

String.prototype.insert = function(index, str) {
    if (index > 0) return this.substring(0, index) + str + this.substring(index, this.length);
    else return str + this;
};

let shiftCache = {};

function invalidateCache() {
    shiftCache = {};
}

async function getAvaliableShifts(date) {
    if (shiftCache[date]) return shiftCache[date];

    const url = "https://vr.star.com.au/syd/ws/ess.asmx/FindWork";

    let csrfToken = localStorage.getItem("csrfToken");
    if (!csrfToken) {
        injectScript(chrome.runtime.getURL("./injected.js"));
        csrfToken = localStorage.getItem("csrfToken");

        if (!csrfToken) {
            console.error("error getting csrf token");
            return;
        }
    }

    const payload = {
        dateString: date,
        excludedWorkChecksums: null,
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                Accept: "*/*",
                "Content-Type": "application/json",
                "X-Csrf-Token": csrfToken,
            },
            credentials: "include",
            referrer: "https://vr.star.com.au/syd/Default.aspx?",
            body: JSON.stringify(payload),
            mode: "cors",
        });

        if (!response.ok) {
            // just in case the token refreshed
            localStorage.removeItem("csrfToken");
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = response.json();
        return data;
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

function createShiftBanner(pit, position, start, end) {
    const banner = document.createElement("div");
    banner.className = "shiftBanner removeable";

    const pitDiv = document.createElement("div");
    pitDiv.className = "pit";
    pitDiv.innerText = pit;
    banner.appendChild(pitDiv);

    const timeDiv = document.createElement("div");
    timeDiv.innerText = start + " - " + end;
    banner.appendChild(timeDiv);

    const positionDiv = document.createElement("div");
    positionDiv.innerText = position;
    banner.appendChild(positionDiv);

    return banner;
}

function createLoadingBanner() {
    const banner = document.createElement("div");
    banner.className = "loadingBanner removeable";

    const textDiv = document.createElement("div");
    textDiv.innerText = "Loading Shifts...";
    banner.appendChild(textDiv);

    const loadingDiv = document.createElement("div");
    loadingDiv.className = "bannerLoading";
    loadingDiv.appendChild(document.createElement("span"));
    loadingDiv.appendChild(document.createElement("span"));
    loadingDiv.appendChild(document.createElement("span"));
    banner.appendChild(loadingDiv);

    return banner;
}

function createNoShiftsBanner() {
    const banner = document.createElement("div");
    banner.className = "noShiftsBanner removeable";

    const innerDiv = document.createElement("div");
    innerDiv.innerText = "No shifts available";
    banner.appendChild(innerDiv);

    return banner;
}

function createMoreShiftsBanner(amount) {
    const banner = document.createElement("div");
    banner.className = "moreShiftsBanner removeable";

    const innerDiv = document.createElement("div");
    innerDiv.innerText = `+${amount} more shifts available`;
    banner.appendChild(innerDiv);

    return banner;
}

function createErrorBanner(message) {
    const banner = document.createElement("div");
    banner.className = "errorBanner removeable";

    const innerDiv = document.createElement("div");
    innerDiv.innerText = `Error: ${message}`;
    banner.appendChild(innerDiv);

    return banner;
}

function displayShifts() {
    document.querySelectorAll(".calendarDay").forEach((day) => {
        if (day.parentElement.classList.contains("past")) return;
        if (day.parentElement.classList.contains("today")) return;
        if (day.querySelector(".future")) return;
        if (day.querySelector(".calendarShift")) return;

        const date = day.parentElement.getAttribute("id");
        if (!date) return;

        day.querySelectorAll(".removeable").forEach((item) => item.remove());

        if (day.querySelector(".loadingBanner")) return;
        const banner = createLoadingBanner();
        day.appendChild(banner);

        getAvaliableShifts(date)
            .then((d) => {
                const data = d.d;
                shiftCache[date] = data;

                banner.remove();
                if (data.Shifts == null)
                    day.appendChild(createNoShiftsBanner());
                else {
                    const displayed = data.Shifts.slice(0, 3);
                    displayed.forEach((shift) => {
                        const pit = data.Locations.find(location => location.ID == shift.LocationID).Name
                        const position = data.Departments.find(department => department.ID == shift.RoleID).Name;
                        const start = shift.StartDateTime.split(" ")[1].insert(2, ":");
                        const end = shift.EndDateTime.split(" ")[1].insert(2, ":");
                        day.appendChild(createShiftBanner(pit, position, start, end))
                    })

                    if (data.Shifts.length > 3) day.appendChild(createMoreShiftsBanner(data.Shifts.length - 3));
                }
            })
            .catch((e) => {
                console.error(e);
                day.appendChild(createErrorBanner(e.message));
            });
    });
}

function modifyBottomNav() {
    const nav = document.querySelector(".navButtonBar.bottom");

    nav.querySelector(".di_next").addEventListener("click", () =>
        waitForRosterContent(modifyBottomNav),
    );

    nav.querySelector(".di_previous").addEventListener("click", () =>
        waitForRosterContent(modifyBottomNav),
    );

    const button = document.createElement("a");
    button.id = "checkShiftsButton";
    button.className = "btn wide pull-right btn-primary";
    button.textContent = "Check Shifts";
    button.onclick = () => {
        invalidateCache();
        displayShifts();
    };
    nav.appendChild(button);

    displayShifts();
}

injectScript(chrome.runtime.getURL("./injected.js"));
waitForRosterContent(modifyBottomNav);
