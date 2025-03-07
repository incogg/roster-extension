(function() {
    const token = window.antiCsrfToken;
    if (token) 
        window.postMessage({type: "csrfToken", token}, "*");
})();