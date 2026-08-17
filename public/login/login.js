async function sendLoginData() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    console.log(username, password);
    const response = await fetch("/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: username,
            password: password
        })
    });
    const result = await response.json();

    if (result.success) {
        window.location.href = result.redirect;
        console.log("Ich war hier!");
    }
}

document
    .getElementById("loginButton")
    .addEventListener("click", sendLoginData);