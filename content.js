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


function displayShifts() {
    document.querySelectorAll(".calendarDay").forEach(day => {
        if (day.parentElement.classList.contains("past")) return;
        if (day.parentElement.classList.contains("today")) return;
        if (day.querySelector(".future")) return;
        if (day.querySelector(".calendarShift")) return;
        
        const date = day.parentElement.getAttribute("id");
        if (!date) return;
        

        let div = day.querySelector(".status");
        if (!div) {
            div = document.createElement("div");
            div.classList.add("status")
            day.appendChild(div);
        }
        div.innerHTML = "Loading...";

        getAvaliableShifts(date).then((data) => {
            shiftCache[date] = data;
            if (data.shifts == null) div.innerHTML = "No Shifts Avaliable";
            else div.innerHTML = "Something Different?";
        }).catch(() => {
            console.error("something went wrong getting avaliable shifts");
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
