import { sendPlayerToServer, refreshValues, getValues, checkDataBeforeServer } from "../shared/data_management.js";
import { setHexColor, createFieldsForPlayers, generateForm, saveUserData, insertUserData } from "../shared/forms.js";
import { addResizeListener, loadNerdy, initializeNerdyDrag } from "../shared/nerdy.js";
import { generateFormButtons, updateButtonDisplayForPage } from "./loadRiveButtons.js";

let games = [];
let players = [];
let gameCards = [];
let timeslots = [];

const retainedRiveInstances = [];

let isChangingPage = false;

let riveButtons;

let riveGameCards;
const gameCardsCanvas = document.createElement("canvas");
const gameCardsContainer = document.createElement("div");

const joinForm = document.getElementById("joinForm");
const formContainer = document.createElement("div");

let nerdy;
let nerdyCanvas;

const buttonContainer = document.createElement("div");

let joinFormHeight;
let currentPageNumber = 0;

let userId = null;

let userData = {};

let fields = [];

const isMobile = matchMedia(
  "(max-width: 700px) and (pointer: coarse)"
).matches;

const scaleFactor = isMobile ? 0.5 : 0.9;

export function shrinkFormHeight() {
    
    const height = joinForm.getBoundingClientRect().height;
    joinForm.style.boxSizing = "border-box";
    joinForm.style.height = `${height}px`;
    //joinForm.style.overflow = "hidden";
    setFormHeight("0.6s", "0");
}

export function setFormHeight(transitionDuration, newHeight) {
        joinForm.style.transition = `height ${transitionDuration}`;
        
        void joinForm.offsetHeight;
        joinForm.style.height = newHeight.toString() + "px";
}

export async function prepareFormPage(pageNumber) {
    joinForm.innerHTML = "";
    buttonContainer.style.display = "flex";
    
    await delay(600);

    currentPageNumber = pageNumber;
    console.log("Neu geladene Seite", currentPageNumber);
    
    const fieldsOfPage = fields[pageNumber - 1];

    updateButtonDisplayForPage(riveButtons, currentPageNumber);

    if (pageNumber < 4) {
        joinForm.appendChild(formContainer);
        generateForm(fieldsOfPage, formContainer.id);
    } else {
        const text = document.createElement("p");
        text.textContent = `Herzlich Willkommen, ${userData.firstName}. Du hast dich erfolgreich zur Nerdsweek angemeldet!`;

        joinForm.appendChild(text);
    }
    joinForm.appendChild(buttonContainer);
    joinFormHeight = joinForm.scrollHeight;

    setFormHeight("0.3s", joinFormHeight);
    if (0 < pageNumber < 4) reloadUserData(pageNumber);
}

function delay(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

export function loadCardInstances() {
    return new Promise((resolve, reject) => {
        riveGameCards = new rive.Rive({
            src: "/assets/rive_files/GameOverview.riv",
            // OR the path to a discoverable and public Rive asset
            // src: '/public/example.riv',
            canvas: gameCardsCanvas,
            autoplay: true,
            autoBind: true,
            isTouchScrollEnabled: true,
            useOffscreenRenderer: false, //true,
            //artboard: "GameOverview", // Optional. If not supplied the default is selected
            stateMachine: "Menu",
            layout: new window.rive.Layout({
                fit: window.rive.Fit.Layout,
                layoutScaleFactor: scaleFactor,
            }),
            onLoad: async () => {
                try {
                    const supportsHover = window.matchMedia(
                        "(hover: hover) and (pointer: fine)"
                    ).matches;

                    clearGameCards();
                    await loadGameCards(supportsHover);

                    updateRiveHeight(
                        scaleFactor,
                        gameCards.length,
                        riveGameCards
                    );

                    riveGameCards.resizeDrawingSurfaceToCanvas();
                    /*addResizeListener(
                        gameCardsContainer.id,
                        riveGameCards
                    );*/

                    resolve();
                } catch (error) {
                    reject(error);
                }
                },
    
                onLoadError: reject,
        });
    });
}

function updateRiveHeight(scaleFactor, cardCount, riveAnimation) {
    const cardWidth = 291 * scaleFactor;
    const cardHeight = 374 * scaleFactor;
    const gap = 0;
    const padding = 20;
    
    const riveFrame = document.getElementById("gameCardsContainer");
    
    const usableWidth = riveFrame.clientWidth //- padding * 2 - gap * cardCount;
    const columns = Math.max(
        1,
        Math.floor((usableWidth) / (cardWidth)),
        );

    const rows = Math.ceil(cardCount / columns);

    riveFrame.style.height =
        `${padding * 2 + rows * cardHeight + (rows - 1) * gap}px`;

    riveAnimation.resizeDrawingSurfaceToCanvas();
}

function clearGameCards() {
  const overview = riveGameCards.viewModelInstance;
  const gamesList = overview.list("gameCards");

  while (gamesList.length > 0) {
    gamesList.removeInstanceAt(gamesList.length - 1);
  }
}

async function loadGameCards(supportsHover) {
    const overview = riveGameCards.viewModelInstance;
    const gamesList = overview.list("gameCards");
    const gameCardVM = riveGameCards.viewModelByName("GameCard");
    const rankVM = riveGameCards.viewModelByName("RankingCircles");



    for (const gameCard of gameCards) {
        const card = gameCardVM.instance();
        retainedRiveInstances.push(card);

        const noCircle = riveGameCards.viewModelByName("RankingCircles").instanceByName("excluded");
        retainedRiveInstances.push(noCircle);

        card.number("gameId").value = gameCard.id;
        card.string("gameTitle").value = games.find(game => game.id === gameCard.id).title;

        card.string("currentRankText").value = "0";
        card.boolean("cardClicked").value = false;
        card.boolean("hoverEnabled").value = supportsHover;
        card.replaceViewModel("middleCircle", noCircle);
        card.boolean("rankButtonClicked").value = false;
        card.boolean("rankButtonIsHovered").value = false;
        card.boolean("isHovered").value = false;
        const cover = await loadRiveImage(gameCard.gameCover);
        card.image("gameCover").value = cover;
        cover.unref();
        const rankList = card.list("rankList");
        
        for (let rankNumber = 1; rankNumber <= 8; rankNumber++) {
            const rank = rankVM.instanceByName(`${rankNumber}`);
            retainedRiveInstances.push(rank);
            rankList.addInstance(rank);
        }

        setHexColor(card.color("primaryGameColor"), gameCard.primaryGameColor);
        setHexColor(card.color("secondaryGameColor"), gameCard.secondaryGameColor);
        setHexColor(card.color("highlightGameColor"), gameCard.highlightGameColor);

        card.number("deltaRank").value = 0;
        card.number("previousRank").value = 0;
        card.number("currentRank").value = 0;
        card.boolean("selectionLocked").value = true;

        gamesList.addInstance(card);
    //    if (gamesList.length >= 2) break;
    }
}

async function loadRiveImage(url) {
    const response = await fetch(url);
    const bytes = new Uint8Array(await response.arrayBuffer());

    return window.rive.decodeImage(bytes);
}

export function cacheUserData(pageNumber) {
    const fieldsOfPage = fields[pageNumber - 1].filter(
        field => !["fieldset", "legend"].includes(field.element)
    );
    if (!checkDataBeforeServer(fieldsOfPage, formContainer.id)) return false;
    saveUserData(fieldsOfPage, userData);

    return true;
}

export function reloadUserData(pageNumber) {
    const fieldsOfPage = fields[pageNumber - 1].filter(
        field => !["fieldset", "legend"].includes(field.element)
    );
    insertUserData(fieldsOfPage, userData);
}

async function changePage(direction) {
    if (isChangingPage) return;

    isChangingPage = true;
    

    try {
        console.log("Aktuelle Seite", currentPageNumber);
        const directions = new Map([
            ["back", currentPageNumber - 1],
            ["continue", currentPageNumber + 1]
        ]);
        const newPageNumber = directions.get(direction);
        let isValid = true;
        if (currentPageNumber !== 0) isValid = cacheUserData(currentPageNumber);
        if (!isValid) {
            joinFormHeight = joinForm.scrollHeight;
            setFormHeight("0.6s", joinFormHeight);
            return;
        }
        shrinkFormHeight();
        await prepareFormPage(newPageNumber);
    } finally {
        isChangingPage = false;
    }
}

async function submitForm(playerId) {
    if (!cacheUserData(currentPageNumber) || isChangingPage) return;

    isChangingPage = true;
    try {
        const result = await sendPlayerToServer(userData, playerId ? playerId : 0, false);
        if (result.success) {
            userData.id = result.newDataId;
            joinFormHeight = joinForm.scrollHeight;
            shrinkFormHeight();
    
            prepareFormPage(4);
    
        } else {
            joinForm.innerHTML = result.message;
        }
    } finally {
        isChangingPage = false;
    }
}

async function showGameSelection() {
    if (isChangingPage) return;

    isChangingPage = true;

    currentPageNumber = currentPageNumber + 1;
    updateButtonDisplayForPage(riveButtons, currentPageNumber);
    
    try {
        joinForm.innerHTML = "";
        joinForm.appendChild(gameCardsContainer);
        gameCardsContainer.appendChild(gameCardsCanvas);
        joinForm.appendChild(buttonContainer);
        
        try {
            await loadCardInstances();
        } catch (error) {
            console.error("Die Karten konnten nicht geladen werden:", error);
            return;
        };
    
        shrinkFormHeight();
    
        joinFormHeight = joinForm.scrollHeight;
    
        setFormHeight("0.6s", joinForm.scrollHeight);
    } finally {
        isChangingPage = false;
    }
}

function submitGamePreferences() {
    
    const gamePreferences = collectGamePreferences();

    const checkResult = checkSelectedGames(gamePreferences);

    if (checkResult.isLegal && !checkResult.incompleteRanks.length) {
        saveGamePreferences(gamePreferences);
        return;
    };

    let message = "";
    if (checkResult.incompleteRanks.length > 0) {
        message = `Den folgenden Rängen hast du noch keine Spiele zugeordnet: ${checkResult.incompleteRanks.join(", ")}.`;
        if (!checkResult.illegalRanks.length) {
            const popup = confirm(message + " Möchtest du deine Präferenzen trotzdem so abschicken?");
            if (popup) {
                saveGamePreferences(gamePreferences);
                return;
            };
        };
    };
    
    if (!checkResult.isLegal) {
        const errorMessage = `Du hast für folgende Ränge mehr als ein Spiel ausgewählt: ${checkResult.illegalRanks.join(", ")}. Entscheide dich für eins.`;
        alert(`${errorMessage}\n${message}`);
    };
}

function collectGamePreferences() {
    const gamesList = riveGameCards.viewModelInstance.list("gameCards");
    const gamePreferences = {
        rank_excluded: [],
        rank_preferred: [],
        rank_1 : [],
        rank_2 : [],
        rank_3 : [],
        rank_4 : [],
        rank_5 : [],
        rank_6 : [],
        rank_7 : [],
        rank_8 : []
    }
    
    for (let i = 0; i < gamesList.length; i++) {
        const gameCard = gamesList.instanceAt(i);
        const rank = gameCard.number("currentRank").value;
        
        const key = rank === 0 ? "rank_preferred"
        : rank === -1 ? "rank_excluded"
        : `rank_${rank}`;
        gamePreferences[key].push(gameCard.number("gameId").value);
    };
    
    
    return gamePreferences;
}

function checkSelectedGames(gamePreferences) {
    let legalChoice = true;
    const incompleteRanks = [];
    const illegalRanks = [];
    
    for (const rank of Object.keys(gamePreferences).slice(2)) {
        const result = checkRank(gamePreferences, rank);
        if (!result.success) {
            legalChoice = false;
            illegalRanks.push(result.rank);
        } else if (!result.complete) incompleteRanks.push(result.rank);
    }

    return {
        isLegal: legalChoice,
        incompleteRanks: incompleteRanks,
        illegalRanks: illegalRanks
    };
}

function checkRank(gamePreferences, rank) {
    const gameCount = gamePreferences[rank].length;
    if ( gameCount === 1) return {success: true, complete: true};
    else if (gameCount === 0) return {success: true, complete: false, rank: Number(rank.replace("rank_", ""))};
    else if (gameCount > 1) return {success: false, rank: Number(rank.replace("rank_", ""))};
}

async function saveGamePreferences(gamePreferences, container) {
    for (const rank in userData.gamePreferences) {
        //Die ausgeschlossenen Spiele (rank_excluded) kommen als Array beim Server an, für alle anderen Ranks erwartet der Server einen Integerwert.
        //"0" steht hierbei dafür, dass keine Präferenz ausgewählt wurde.
        userData.gamePreferences[rank] = gamePreferences[rank].length 
            && rank !== "rank_excluded"
            ? gamePreferences[rank][0] 
            : !gamePreferences[rank].length 
            && rank !== "rank_excluded"
            ? 0
            : gamePreferences[rank];
    };
    
    const result = await sendPlayerToServer(userData, userData.id, false);
    console.log("Speicherung der Spiele in der Datenbank erfolgreich?", result.success);

    if (result.success) {
        shrinkFormHeight();
        
        joinForm.innerHTML = "Deine Auswahl wurde gespeichert! Du wirst gleich zur Startseite weitergeleitet.";
    
        joinFormHeight = joinForm.scrollHeight;
    
        setFormHeight("0.6s", joinFormHeight);
    
        await delay(2000);

        window.location.href("/");
    }
}

async function start() {
    await loadData();
    
    prepareIdAndClassNames();

    const buttonConfig = {
        letsGo: {
            onClick: () => changePage("continue"),
            pages: [0]
        },
        back: {
            onClick: () => changePage("back"),
            pages: [2, 3]
        },
        continue: {
            onClick: () => changePage("continue"),
            pages: [1, 2]
        },
        submitForm: {
            onClick: () => submitForm(userData.id),
            pages: [3]
        },
        toGameSelection: {
            onClick: () => showGameSelection(),
            pages: [4]
        },
        submitGamePreferences: {
            onClick: () => submitGamePreferences(),
            pages: [5]
        }
    };
    
    riveButtons = await generateFormButtons(joinForm, buttonContainer, buttonConfig);
    updateButtonDisplayForPage(riveButtons, currentPageNumber);
    
    nerdy = loadNerdy(nerdyCanvas.id, "body");
    initializeNerdyDrag(nerdyCanvas);

    document.getElementById("welcome").textContent = "Werde Teil der Nerdsweek-Community und verbringe mehrere Tage mit andere spielebegeisterten Nerds und Nerdinnen!";
    joinFormHeight = joinForm.scrollHeight;
    riveButtons.letsGo.rive.resizeDrawingSurfaceToCanvas();
    setTimeout(() => {
        setFormHeight("0.6s", joinFormHeight);
    }, 200);
}

async function loadData() {
    const pageNumbers = [1, 2, 3];
    const pages = new Map([
        [1, "personalData"],
        [2, "logistics"],
        [3, "other"]
    ]);
    fields = await Promise.all(
        pageNumbers.map(page =>
            createFieldsForPlayers(pages.get(page))
        )
    );

    const dataTypes = ["gameCards", "games", "players", "emptyPlayer"];

    [gameCards, games, players, userData] = await Promise.all(
        dataTypes.map(async (dataType) => {
            await refreshValues(dataType);
            return getValues(dataType);
        })
    );
    console.log("Daten geladen",
        fields,
        gameCards,
        games,
        players,
        userData
    );
}

function prepareIdAndClassNames() {
    nerdyCanvas = createCanvas("nerdyCanvas", "body");
    nerdyCanvas.id = "nerdyCanvas";
    nerdyCanvas.className = "nerdy-canvas";
    
    gameCardsContainer.id = "gameCardsContainer";
    gameCardsContainer.className = "game-cards-container";
    
    gameCardsCanvas.id = "gameCardsCanvas";
    gameCardsCanvas.className = "game-cards-canvas";
    
    formContainer.id = "formContainer";
    formContainer.className = "form-container";
    
    joinForm.className = "join-form";
}

export function createCanvas(id, parentId) {
    const canvas = document.createElement("canvas");
    canvas.id = id;
    const parent = document.getElementById(parentId);
    parent.appendChild(canvas);

    return canvas;
}

start();