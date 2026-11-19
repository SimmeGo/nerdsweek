import { createButton } from "../shared/forms.js";

export function createPlayCardCreator({ games, gameCards, players, dragAndDrop, editActions }) {
   
    function createPlayCard(play, rowNumber, doublePlayers, playersInExcludedGame, timeslot, plays) {
        const playCardType = play.playedGame === "Nicht zugeordnet" ? "notAssigned" : "normal";

        const playCardContainer = document.createElement("div");
        playCardContainer.id = `playCard${rowNumber + 1}-${timeslot}`;
        playCardContainer.dataset.playId = play.id;
        playCardContainer.dataset.type = "play";
        playCardContainer.dataset.timeslot = timeslot;
        playCardContainer.dataset.playCardType = playCardType;
        playCardContainer.classList.add("table-cell");

        const playedGame = games.find(game => game.id === play.playedGame);
        if (playedGame) {
            if (!play.isValidPlayerCount(playedGame)) {
                playCardContainer.classList.add("invalid-player-count");
            } else if (play.isPerfectPlayerCount(playedGame)) {
                playCardContainer.classList.add("perfect-player-count");
            } else {
                playCardContainer.classList.add("valid-player-count");
            };
        };
        
        const bgImage = gameCards.find(card => card.id === play.playedGame)?.gameCover;
        
        if (bgImage) {
            const bgImgElement = document.createElement("img");
            bgImgElement.className = "cell-img";
            bgImgElement.src = bgImage;
            bgImgElement.draggable = false;
            playCardContainer.appendChild(bgImgElement);
        };

        const titleElement = document.createElement("span");
        titleElement.className = "bold-text-in-table"
        titleElement.textContent = playedGame?.title ?? play.playedGame;
        playCardContainer.appendChild(titleElement);
        
        dragAndDrop.container(playCardContainer, plays, createPlayerName, players);
        
        
        const playerContainer = document.createElement("div");
        playerContainer.id = `playerContainer${rowNumber + 1}-${timeslot}`;
        playerContainer.dataset.playId = play.id;
        playerContainer.className = "player-container";
        playCardContainer.appendChild(playerContainer)
        
        createPlayerSection(play, playerContainer, playCardContainer, doublePlayers, playersInExcludedGame, plays)

        return playCardContainer;
    }

    function createPlayerSection(play, playerContainer, playCardContainer, doublePlayers, playersInExcludedGame, plays) {
        const fullNames = [];
        const initialsNames = [];

        playerContainer.innerHTML = "";
        
        play.players.forEach(player => {
            const thisPlayer = players.find(p => p.id === player);

            const playerElement = createPlayerElement(play, thisPlayer, doublePlayers, playersInExcludedGame, playCardContainer.dataset.timeslot);
        
            const [fullName, initialsName] = createPlayerName(play, thisPlayer);

            const span = document.createElement("span");
            playerElement.appendChild(span);
        
            dragAndDrop.player(playerElement);
        
            fullNames.push(fullName);
            initialsNames.push(initialsName);
            span.textContent = initialsName;
            playerContainer.appendChild(playerElement);
        });
        
        registerListenerForExtendingPlayerNames(fullNames, initialsNames, playerContainer, playCardContainer);
    }

    function createPlayerElement(play, thisPlayer, doublePlayers, playersInExcludedGame, timeslot) {
        const playerElement = document.createElement("span");
        playerElement.dataset.type = "player";
        playerElement.dataset.playId = play.id;
        playerElement.dataset.playerId = thisPlayer.id;
        playerElement.dataset.timeslot = timeslot;
        if (doublePlayers.includes(thisPlayer.id) || playersInExcludedGame.includes(thisPlayer.id)) playerElement.className = "marked-player";
        playerElement.style.backgroundColor = thisPlayer.color;

        const removeButton = createButton("", "x", "text", "remove-player-button roundButton", (event) => {
            event.stopPropagation();
            editActions.removePlayer(Number(playerElement.dataset.playId), Number(playerElement.dataset.playerId))
        });
        
        playerElement.appendChild(removeButton);
        

        return playerElement;
    }

    function createPlayerName(play, thisPlayer) {
        const playerName = `${thisPlayer.firstName} ${thisPlayer.lastName}`;
        const initials = `${thisPlayer.firstName.slice(0,1)}${thisPlayer.lastName.slice(0,1)}`;
        const rank = Object.entries(thisPlayer.gamePreferences)
            .find(([key, value]) => value === play.playedGame);
        const rankNumber = rank ? ` (${rank[0].replace("rank_", "")})` : "";
        const fullName = `${playerName}${rankNumber}`;
        const initialsName = `${initials}${rankNumber}`;

        return [fullName, initialsName];
    }

    function registerListenerForExtendingPlayerNames(fullNames, initialsNames, playerContainer, playCardContainer) {
        const spans = playerContainer.querySelectorAll(":scope > span");
        let showFull = true;

        playCardContainer.addEventListener("click", () => {
            if (showFull) {
                //playerContainer.style.height = playerContainer.scrollHeight;
                spans.forEach((span, index) => {
                    const textSpan = span.querySelector(":scope > span");
                    textSpan.textContent = fullNames[index];
                    span.style.aspectRatio = "5 / 1";
                });
                playerContainer.style.gridTemplateColumns = "1fr";
                showFull = false;
            } else {
                playerContainer.style.height = "auto";
                spans.forEach((span, index) => {
                    const textSpan = span.querySelector(":scope > span");
                    textSpan.textContent = initialsNames[index];
                    span.style.aspectRatio = "1 / 1";
                });
                playerContainer.style.gridTemplateColumns = "repeat(var(--players-per-row), minmax(40px, 1fr))";
                showFull = true;
            };
        });
    }

    return { createPlayCard };
}