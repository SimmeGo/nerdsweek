console.log("Datei wurde geladen");
async function checkLogin() {
    console.log("checkLogin() aufgerufen");
    const response = await fetch("/admin");
    console.log(response.status);
    return response.ok;
}

async function checkLoginAndRedirect() {
    const loggedIn = await checkLogin();
    const currentUrl = window.location.pathname;

    if (!loggedIn) {
        console.log(encodeURIComponent(currentUrl));
        window.location.pathname = "login.html?returnTo="+ encodeURIComponent(currentUrl);
    } else {
        console.log("Benutzer ist eingeloggt");
        window.location.pathname = currentUrl;
    }
}

checkLoginAndRedirect();