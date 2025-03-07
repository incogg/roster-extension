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

async function getAvaliableShifts(dateString) {
    const url = "https://vr.star.com.au/syd/ws/ess.asmx/FindWork";

    const csrfToken = localStorage.getItem("csrfToken");
    if (!csrfToken) return;

    const payload = {
        dateString: dateString,
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

        return response.json();
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
        
        const div = document.createElement("div");
        div.innerHTML = "Loading...";
        day.appendChild(div);

        getAvaliableShifts(date).then((data) => {
            console.log(data);
            if (data.shifts == null) div.innerHTML = "No Shifts Avaliable";
            else div.innerHTML = "Something Different?";
        }).catch(() => {
            div.remove();
            document.getElementById("checkShiftsButton").style.backgroundColor = "red";
        });

    });
}

function modifyBottomNav() {
    const nav = document.querySelector(".navButtonBar.bottom");

    const button = document.createElement("a");
    button.id = "checkShiftsButton"
    button.className = "btn wide pull-right di_swap_days btn-primary";
    button.textContent = "Check Shifts";
    button.onclick = displayShifts;

    nav.querySelector(".di_next").addEventListener("click", () => {
        waitForRosterContent(modifyBottomNav);
    })
    nav.querySelector(".di_previous").addEventListener("click", () => {
        waitForRosterContent(modifyBottomNav);
    })
    
    nav.appendChild(button);
    button.click();
}

waitForRosterContent(modifyBottomNav);
