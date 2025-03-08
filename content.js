function waitForRosterContent(callback) {
    const observer = new MutationObserver((mutations, obs) => {
        if (document.getElementById("rosterContent")) {
            obs.disconnect();
            callback();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    injectScript(chrome.runtime.getURL('/injected.js'));
}

window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data || event.data.type !== "csrfToken") return;
    localStorage.setItem("csrfToken", event.data.token);
});

function injectScript(file) {
    const script = document.createElement('script');
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('src', file);
    document.body.appendChild(script);
}

let shiftCache = {};

function invalidateCache() {
    shiftCache = {};
}

async function getAvaliableShifts(date) {
    if (shiftCache[date]) return shiftCache[date];

    const url = "https://vr.star.com.au/syd/ws/ess.asmx/FindWork";

    const csrfToken = localStorage.getItem("csrfToken");
    if (!csrfToken) return;

    const payload = {
        dateString: date,
        excludedWorkChecksums: null
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Accept": "*/*",
                "Content-Type": "application/json",
                "X-Csrf-Token": csrfToken
            },
            credentials: "include",
            referrer: "https://vr.star.com.au/syd/Default.aspx?",
            body: JSON.stringify(payload),
            mode: "cors"
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = response.json();
        return data;
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

function createShiftBanner(pit, start, finish, position) {
    const banner = document.createElement("div");
    banner.className = "shiftBanner";

    const pitDiv = document.createElement("div");
    pitDiv.className = "pit"
    pitDiv.innerText = pit;
    banner.appendChild(pitDiv);

    const timeDiv = document.createElement("div");
    timeDiv.innerText = start + " - " + finish;
    banner.appendChild(timeDiv);

    const positionDiv = document.createElement("div");
    positionDiv.innerText = position;
    banner.appendChild(positionDiv);

    return banner;
}

function createLoadingBanner() {
    const banner = document.createElement("div");
    banner.className = "loadingBanner";

    const textDiv = document.createElement("div");
    textDiv.innerText = "Loading Shifts...";
    banner.appendChild(textDiv);

    const loadingDiv = document.createElement("div");
    loadingDiv.className = "bannerLoading"
    loadingDiv.appendChild(document.createElement("span"));
    loadingDiv.appendChild(document.createElement("span"));
    loadingDiv.appendChild(document.createElement("span"));
    banner.appendChild(loadingDiv);

    return banner;
}

function createNoShiftsBanner() {
    const banner = document.createElement("div");
    banner.className = "noShiftsBanner"

    const innerDiv = document.createElement("div");
    innerDiv.innerText = "No shifts available";
    banner.appendChild(innerDiv)

    return banner;
}

function createMoreShiftsBanner(amount) {
    const banner = document.createElement("div");
    banner.className = "moreShiftsBanner"

    const innerDiv = document.createElement("div");
    innerDiv.innerText = `+${amount} more shifts available`;
    banner.appendChild(innerDiv)

    return banner;
}

function createErrorBanner(message) {
    const banner = document.createElement("div");
    banner.className = "errorBanner"

    const innerDiv = document.createElement("div");
    innerDiv.innerText = `Error: ${message}`;
    banner.appendChild(innerDiv)

    return banner;
}

function displayShifts() {
    document.querySelectorAll(".calendarDay").forEach(day => {
        if (day.parentElement.classList.contains("past")) return;
        if (day.parentElement.classList.contains("today")) return;
        if (day.querySelector(".future")) return;
        if (day.querySelector(".calendarShift")) return;
        
        const date = day.parentElement.getAttribute("id");
        if (!date) return;
        
        const noShifts = day.querySelector(".noShiftsBanner");
        if(noShifts) noShifts.remove();

        if (day.querySelector(".loadingBanner")) return;
        const banner = createLoadingBanner();
        day.appendChild(banner);

        getAvaliableShifts(date).then((data) => {
            shiftCache[date] = data;
            
            banner.remove();
            if (data.shifts == null) 
                day.appendChild(createNoShiftsBanner());
            else {
                day.appendChild(createMoreShiftsBanner(1));
            }
        }).catch((e) => {
            console.error(e);
            day.appendChild(createErrorBanner(e.message));
        });

    });
}

function modifyBottomNav() {
    const nav = document.querySelector(".navButtonBar.bottom");

    const button = document.createElement("a");
    button.id = "checkShiftsButton"
    button.className = "btn wide pull-right di_swap_days btn-primary";
    button.textContent = "Check Shifts";
    button.onclick = () => {
        invalidateCache();
        displayShifts();
    };

    nav.querySelector(".di_next").addEventListener("click", () => {
        waitForRosterContent(modifyBottomNav);
    })
    nav.querySelector(".di_previous").addEventListener("click", () => {
        waitForRosterContent(modifyBottomNav);
    })
    
    nav.appendChild(button);
    displayShifts();
}

waitForRosterContent(modifyBottomNav);
