let games = [];
let players = [];

async function loadGames() {
    const response = await fetch("/games");
    games = await response.json();
    console.log(games.length);
}

function createDropdown(n) {
    
    for (let i = 0; i < games.length; i++) {
        const game = games[i];
        const option = document.createElement("option");
        option.value = game.id;
        option.textContent = game.title;
        document.getElementById("rank" + n).appendChild(option);
    }
    const noPreference = document.createElement("option");
    noPreference.value = "0";
    noPreference.textContent = "keine Präferenz";
    document.getElementById("rank" + n).appendChild(noPreference);
}

function multiDropdown() {
    for (let i = 0; i < 8; i++) {
        number = i + 1;
        createDropdown(number);
    }
}

async function createPlayer() {
    const firstName = document.getElementById("firstName").value;
    const lastName = document.getElementById("lastName").value;
    const rank1 = document.getElementById("rank1").value;
    const rank2 = document.getElementById("rank2").value;
    const rank3 = document.getElementById("rank3").value;
    const rank4 = document.getElementById("rank4").value;
    const rank5 = document.getElementById("rank5").value;
    const rank6 = document.getElementById("rank6").value;
    const rank7 = document.getElementById("rank7").value;
    const rank8 = document.getElementById("rank8").value;
    console.log(firstName, lastName, rank1, rank2, rank3, rank4, rank5, rank6, rank7, rank8);
    const response = await fetch("/players", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            firstName: firstName,
            lastName: lastName,
            rank1: rank1,
            rank2: rank2,
            rank3: rank3,
            rank4: rank4,
            rank5: rank5,
            rank6: rank6,
            rank7: rank7,
            rank8: rank8,
            playerId: 0,
            del: false
        })
    });
    const result = await response.json();
    console.log(result);
}

async function start() {
    await loadGames();
    multiDropdown();

}

start();
document
    .getElementById("submitPlayer")
    .addEventListener("click", createPlayer);