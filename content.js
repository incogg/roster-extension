
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

const TEST_MODE = false;
const TEST_DATA = {
    d: {
        Shifts: [
            { LocationID: 1, RoleID: 1, StartDateTime: "20260507 1800", EndDateTime: "20260508 0200" },
            { LocationID: 2, RoleID: 2, StartDateTime: "20260507 2000", EndDateTime: "20260508 0400" },
            { LocationID: 3, RoleID: 1, StartDateTime: "20260507 1400", EndDateTime: "20260507 2200" },
            { LocationID: 1, RoleID: 3, StartDateTime: "20260507 0600", EndDateTime: "20260507 1400" },
            { LocationID: 4, RoleID: 2, StartDateTime: "20260507 2200", EndDateTime: "20260508 0600" },
        ],
        Locations: [
            { ID: 1, Name: "P05" },
            { ID: 2, Name: "Pit 21" },
            { ID: 3, Name: "P07" },
            { ID: 4, Name: "P12" },
        ],
        Departments: [
            { ID: 1, Name: "1.DLR" },
            { ID: 2, Name: "TG" },
            { ID: 3, Name: "2.DLR" },
        ],
    }
};

let shiftCache = {};
function invalidateCache() {
    shiftCache = {};
}

async function getAvaliableShifts(date) {
    if (TEST_MODE) return TEST_DATA;
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

function el(tag, { className, text } = {}, ...children) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = text;
    e.append(...children);
    return e;
}

function banner(className, ...children) {
    return el("div", { className: `${className} banner` }, ...children);
}

function createShiftBanner(pit, position, start, end) {
    return banner(
        "shiftBanner",
        el("div", { className: "pit", text: pit }),
        el("div", { text: `${start} - ${end}` }),
        el("div", { text: position }),
    );
}

function createLoadingBanner() {
    return banner(
        "loadingBanner",
        el("div", { text: "Loading Shifts..." }),
        el(
            "div",
            { className: "bannerLoading" },
            el("span"),
            el("span"),
            el("span"),
        )
    );
}

function createNoShiftsBanner() {
    return banner(
        "noShiftsBanner",
        el("div", { text: "No shifts available" }),
    );
}

function createMoreShiftsBanner(amount) {
    return banner(
        "moreShiftsBanner",
        el("div", { text: `+${amount} more shifts available` }),
    );
}

function createErrorBanner(message) {
    return banner(
        "errorBanner",
        el("div", { text: `Error: ${message}` }),
    );
}

function displayShifts() {
    document.querySelectorAll(".calendarDay").forEach((day) => {
        if (day.parentElement.classList.contains("past")) return;
        if (day.parentElement.classList.contains("today")) return;
        if (day.querySelector(".future")) return;
        if (day.querySelector(".calendarShift")) return;

        const date = day.parentElement.getAttribute("id");
        if (!date) return;

        if (day.querySelector(".loadingBanner")) return;
        day.querySelectorAll(".banner").forEach((item) => item.remove());

        const banner = createLoadingBanner();
        day.appendChild(banner);

        getAvaliableShifts(date)
            .then((d) => {
                shiftCache[date] = d;
                const data = d.d;

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
    if (!nav) return;

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

// --- Mobile support ---

const MONTH_NAMES = { Jan:1, Feb:2, Mar:3, Apr:4, May:5, Jun:6, Jul:7, Aug:8, Sep:9, Oct:10, Nov:11, Dec:12 };
let mobileWeekTitle = null;

function parseMobileDate(li) {
    const span = li.querySelector("span.minor.date");
    if (!span) return null;
    const match = span.textContent.match(/(\d+)\s+([A-Za-z]+)/);
    if (!match) return null;
    const day = match[1].padStart(2, "0");
    const monthNum = MONTH_NAMES[match[2].slice(0, 3)];
    if (!monthNum) return null;
    const month = String(monthNum).padStart(2, "0");
    const yearMatch = document.title.match(/\b(\d{4})\b/);
    const titleYear = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
    // Title year is the year of the last day of the week; December days in a Dec–Jan week are in year-1
    const year = (monthNum === 12 && yearMatch) ? titleYear - 1 : titleYear;
    return `${year}${month}${day}`;
}

function displayMobileShifts() {
    document.querySelectorAll("li[class*='date_']").forEach((li) => {
        if (!li.classList.contains("clickable")) return;
        if (li.classList.contains("dayPast")) return;
        if (li.classList.contains("dayToday")) return;
        if (li.querySelector(".times")) return;

        const date = parseMobileDate(li);
        if (!date) return;

        if (li.querySelector(".mobileLoadingBanner")) return;
        li.querySelectorAll(".mobileBanner").forEach((e) => e.remove());

        const tr = li.querySelector("tr");
        const target = tr?.cells.length >= 3 ? tr.cells[tr.cells.length - 2] : li;
        if (target !== li) {
            tr.cells[0].style.whiteSpace = "nowrap";
            tr.cells[0].style.width = "1px";
            tr.cells[0].style.minWidth = "155px";
            target.style.cssText = "overflow: hidden; vertical-align: middle; padding: 0 4px; text-align: left;";
        }

        const loading = el("div", { className: "mobileBanner mobileLoadingBanner", text: "…" });
        target.appendChild(loading);

        getAvaliableShifts(date)
            .then((d) => {
                shiftCache[date] = d;
                loading.remove();
                const data = d.d;
                if (data.Shifts == null) {
                    target.appendChild(el("div", { className: "mobileBanner mobileNoShiftsBanner", text: "No shifts" }));
                } else {
                    const container = el("div", { className: "mobileBanner mobileShiftsBanner" });
                    const displayed = data.Shifts.slice(0, 2);
                    displayed.forEach((shift) => {
                        const pit = data.Locations.find((loc) => loc.ID == shift.LocationID).Name;
                        const start = shift.StartDateTime.split(" ")[1].insert(2, ":");
                        const end = shift.EndDateTime.split(" ")[1].insert(2, ":");
                        const pill = el("div", { className: "mobileShiftPill" });
                        pill.appendChild(el("span", { className: "mobileShiftPillTime", text: `${start}–${end}` }));
                        pill.appendChild(el("span", { className: "mobileShiftPillPit", text: pit }));
                        container.appendChild(pill);
                    });
                    if (data.Shifts.length > 2)
                        container.appendChild(el("div", { className: "mobileShiftPill mobileShiftPillMore", text: `+${data.Shifts.length - 2} more` }));
                    target.appendChild(container);
                }
            })
            .catch((e) => {
                loading.remove();
                target.appendChild(el("div", { className: "mobileBanner mobileErrorBanner", text: "Error" }));
            });
    });
}

function modifyMobileNav() {
    mobileWeekTitle = document.querySelector(".mainTitle h1")?.textContent ?? null;
    const navMiddle = document.querySelector("#headerContainer .header table td:nth-child(2)");
    if (!navMiddle) return;

    navMiddle.style.textAlign = "center";

    const button = el("a", { className: "button small" });
    button.id = "checkShiftsMobileButton";
    button.textContent = "Check Shifts";
    button.style.whiteSpace = "nowrap";
    button.onclick = () => {
        invalidateCache();
        displayMobileShifts();
    };
    navMiddle.textContent = "";
    navMiddle.appendChild(button);

    displayMobileShifts();
}

injectScript(chrome.runtime.getURL("./injected.js"));

new MutationObserver(() => {
    if (document.getElementById("rosterContent") && !document.getElementById("checkShiftsButton")) {
        modifyBottomNav();
    }
    if (document.querySelector("li[class*='date_']")) {
        if (!document.getElementById("checkShiftsMobileButton")) {
            modifyMobileNav();
        } else {
            const currentTitle = document.querySelector(".mainTitle h1")?.textContent;
            if (currentTitle && currentTitle !== mobileWeekTitle) {
                mobileWeekTitle = currentTitle;
                displayMobileShifts();
            }
        }
    }
}).observe(document.body, { childList: true, subtree: true });

// trigger an initial check in case rosterContent is already in the DOM
const _dummy = document.createElement("div");
document.body.appendChild(_dummy);
_dummy.remove();
