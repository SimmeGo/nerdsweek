import { sendPlayerToServer, refreshValues, getValues, getValuesfromForm, checkDataBeforeServer } from "../shared/data_management.js";
import { addDataToDatabaseButton, createGamesOptions, setHexColor, createFieldsForLogistics, createRankFields, createFieldsForPlayers, generateForm } from "../shared/forms.js";
import { addResizeListener, loadNerdy, initializeNerdyDrag } from "../shared/nerdy.js";

let games = [];
let players = [];
let gameCards = [];
let timeslots = [];

let riveGameCards;
const gameCardsCanvas = document.createElement("canvas");
const gameCardsContainer = document.createElement("div");

const joinForm = document.getElementById("joinForm");
const formContainer = document.createElement("div");

let nerdy;
let nerdyCanvas;

const buttonFile = new rive.RiveFile({
    src: "/assets/rive_files/button.riv",
});

const buttonFileReady = buttonFile.init();

const textColor = "#FFFFFF";
const strokeColor = "#905AEE";

const buttonContainer = document.createElement("div");

let riveButtons = {
    letsGo: {
        canvas: null,
        rive: null,
        text: "Los geht's",
        alignment: rive.Alignment.CenterLeft,
        clickFunction: () => formButtonClicked("continue"),
        pages: [0]
    },
    back: {
        canvas: null,
        rive: null,
        text: "zurück",
        alignment: rive.Alignment.CenterLeft,
        clickFunction: () => formButtonClicked("back"),
        pages: [2, 3]
    },
    continue: {
        canvas: null,
        rive: null,
        text: "weiter",
        alignment: rive.Alignment.CenterRight,
        clickFunction: () => formButtonClicked("continue"),
        pages: [1, 2]
    },
    submit: {
        canvas: null,
        rive: null,
        text: "absenden",
        alignment: rive.Alignment.CenterRight,
        clickFunction: () => submitButtonClicked(),
        pages: [3]
    },
    toGameSelection: {
        canvas: null,
        rive: null,
        text: "weiter zur Spieleauswahl",
        alignment: rive.Alignment.CenterRight,
        clickFunction: () => gameSelectionButtonClicked(),
        pages: [4]
    }
};

let joinFormHeight;
let currentPageNumber = 0;

let userId = null;
const userData = {
    firstName: null,
    lastName: null,
    email: null,
    mobile: null,
    timeslots: {
        all: false,
        1: false,
        2: false,
        3: false,
        4: false,
        5: false,
        6: false,
        7: false,
        8: false
    },
    stayOvernight: false,
    roomPreference: null,
    bedLinenNeeded: false,
    modeOfTransportation: null,
    vegetarian: false,
    otherFoodNeeds: false,
    foodNeedsText: null,
    joinWhatsApp: null,
    agreeToJoin: false,
    gamePreferences: {}
}

let fields = [];

let pages;

const isMobile = matchMedia(
  "(max-width: 700px) and (pointer: coarse)"
).matches;

const scaleFactor = isMobile ? 0.5 : 0.9;

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

    console.log(`width: ${cardWidth}`, `height: ${cardHeight}`, `div: ${riveFrame}`, `windowWidth: ${usableWidth}`, `columns: ${columns}`, `rows: ${rows}`);

    riveFrame.style.height =
        `${padding * 2 + rows * cardHeight + (rows - 1) * gap}px`;

    riveAnimation.resizeDrawingSurfaceToCanvas();

    console.log({
    gesetzteHoehe: riveFrame.style.height,
    tatsaechlicheHoehe: riveFrame.getBoundingClientRect().height,
    canvasHoehe: gameCardsCanvas.getBoundingClientRect().height,
});
}
 
async function loadRiveImage(url) {
    const response = await fetch(url);
    const bytes = new Uint8Array(await response.arrayBuffer());

    return window.rive.decodeImage(bytes);
}



async function loadData() {
    const pageNumbers = [1, 2, 3, 4];
    const pages = new Map([
        [1, "personalData"],
        [2, "logistics"],
        [3, "other"],
        [4, "ranking"]
    ]);
    fields = await Promise.all(
        pageNumbers.map(page =>
            createFieldsForPlayers(pages.get(page))
        )
    );

    await refreshValues("gameCards");
    gameCards = await getValues("gameCards");
    await refreshValues("games");
    games = await getValues("games");
    await refreshValues("players");
    players = await getValues("players");
    console.log("Fields ist", fields);
}

function loadCardInstances() {
    return new Promise((resolve, reject) => {
        riveGameCards = new rive.Rive({
            src: "/assets/rive_files/GameOverview.riv",
            // OR the path to a discoverable and public Rive asset
            // src: '/public/example.riv',
            canvas: gameCardsCanvas,
            autoplay: true,
            autoBind: true,
            isTouchScrollEnabled: true,
            useOffscreenRenderer: true,
            //artboard: "GameOverview", // Optional. If not supplied the default is selected
            stateMachine: "Menu",
            layout: new window.rive.Layout({
                fit: window.rive.Fit.Layout,
                layoutScaleFactor: scaleFactor,
            }),
            onLoad: () => {
                try {
                        const supportsHover = window.matchMedia(
                            "(hover: hover) and (pointer: fine)"
                        ).matches;
    
                        clearGameCards();
                        loadGameCards(supportsHover);
    
                        updateRiveHeight(
                            scaleFactor,
                            gameCards.length,
                            riveGameCards
                        );
    
                        riveGameCards.resizeDrawingSurfaceToCanvas();
                        addResizeListener(
                            gameCardsContainer.id,
                            riveGameCards
                        );
    
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                },
    
                onLoadError: reject,
        });
    });
}

function clearGameCards() {
  const overview = riveGameCards.viewModelInstance;
  const gamesList = overview.list("gameCards");

  while (gamesList.length > 0) {
    gamesList.removeInstanceAt(gamesList.length - 1);
  }
}

async function loadRiveButton(preferences) {
    await buttonFileReady;

    const button = new rive.Rive({
        riveFile: buttonFile,
        canvas: preferences.canvas,
        autoplay: true,
        autoBind: true,
        isTouchScrollEnabled: true,
        useOffscreenRenderer: false,
        stateMachine: "State Machine 1",
        layout: new window.rive.Layout({
            fit: window.rive.Fit.FitHeight,
            alignment: preferences.alignment
        }),
        onLoad: () => {
            let lastRatio;

            button.on(rive.EventType.Advance, () => {
                const bounds = button.bounds;
                if (!bounds) return;

                const width = bounds.maxX - bounds.minX;
                const height = bounds.maxY - bounds.minY;
                if (width <= 0 || height <= 0) return;

                const ratio = `${width} / ${height}`;
                if (ratio === lastRatio) return;

                lastRatio = ratio;
                preferences.canvas.style.aspectRatio = ratio;

                requestAnimationFrame(() => {
                    button.resizeDrawingSurfaceToCanvas();
                });
            });

            customizeButtonInstance(button, preferences.text, textColor, strokeColor);
            addResizeListener("joinForm", button);

            button.resizeDrawingSurfaceToCanvas();
            const buttonInstance = button.viewModelInstance;
            const clicked = buttonInstance.trigger("isClicked");
            clicked.on(() => {
                preferences.clickFunction();
            })
        },
    });

    return button
}

function shrinkFormHeight() {
    
    const height = joinForm.getBoundingClientRect().height;
    joinForm.style.boxSizing = "border-box";
    joinForm.style.height = `${height}px`;
    //joinForm.style.overflow = "hidden";
    setFormHeight("0.6s", "0");
}

function setFormHeight(transitionDuration, newHeight) {
        console.log("Neue Höhe entspricht", newHeight.toString() + "px");
        joinForm.style.transition = `height ${transitionDuration}`;
        
        void joinForm.offsetHeight;
        joinForm.style.height = newHeight.toString() + "px";
}

async function prepareFormPage(pageNumber) {
    joinForm.innerHTML = "";
    buttonContainer.style.display = "flex";
    
    currentPageNumber = pageNumber;
    console.log("Neu geladene Seite", currentPageNumber);
    
    const fieldsOfPage = fields[pageNumber - 1];
    console.log("Die Fields der Seite", fieldsOfPage);

    for (const buttonKey in riveButtons) {
        const button = riveButtons[buttonKey];
        button.canvas.style.display = button.pages.includes(pageNumber) ? "flex" : "none";
        button.rive.viewModelInstance.boolean("isHovered").value = false;
        requestAnimationFrame(() => {
            button.rive.resizeDrawingSurfaceToCanvas();
        });
    };

    setTimeout(() => {
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
        if (pageNumber !== 0) reloadUserData(pageNumber);
    }, 1200)
}

function customizeButtonInstance(riveInstance, text, textColor, strokeColor) {
    const button = riveInstance.viewModelInstance;

    button.boolean("isHovered").value = false;
    setHexColor(button.color("textColor"), textColor);
    setHexColor(button.color("strokeColor"), strokeColor);
    button.string("text").value = text;
}

async function loadGameCards(supportsHover) {
    const overview = riveGameCards.viewModelInstance;
    const gamesList = overview.list("gameCards");
    const gameCardVM = riveGameCards.viewModelByName("GameCard");
    const rankVM = riveGameCards.viewModelByName("RankingCircles");

    for (const gameCard of gameCards) {
        const card = gameCardVM.instance();
        const noCircle = riveGameCards.viewModelByName("RankingCircles").instanceByName("excluded");

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
    }
}

function createCanvas(id, parentId) {
    const canvas = document.createElement("canvas");
    canvas.id = id;
    const parent = document.getElementById(parentId);
    parent.appendChild(canvas);

    return canvas;
}

async function formButtonClicked(direction) {
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
}

function cacheUserData(pageNumber) {
    const fieldsOfPage = fields[pageNumber - 1].filter(
        field => !["fieldset", "legend"].includes(field.element)
    );
    if (!checkDataBeforeServer(fieldsOfPage, formContainer.id)) return false;
    fieldsOfPage.forEach(field => {
        if (Object.keys(userData).includes(field.name)) {
            if (field.name === "timeslots") {
                console.log("timeslot");
                userData.timeslots[field.value] = document.querySelector(`input[name="timeslots"][value="${field.value}"]`).checked;
            } else if (["checkbox"].includes(field.element) && field.name !== "timeslots") {
                console.log("checkbox");
                userData[field.value] = document.querySelector(`input[value="${field.value}"]`).checked;
            } else if (["radio"].includes(field.element)) {
                console.log("radio");
                const value = document.querySelector(`input[name=${field.name}]:checked`)?.value;
                userData[field.name] = value === "true" ? true
                                     : value === "false" ? false
                                     : value;
            } else {
                console.log("other");
                userData[field.name] = document.getElementById(field.name).value;
            };
        };
    });

    console.log(userData);

    return true;
}

function reloadUserData(pageNumber) {
    const fieldsOfPage = fields[pageNumber - 1].filter(
        field => !["fieldset", "legend"].includes(field.element)
    );
    fieldsOfPage.forEach(field => {
        if (Object.keys(userData).includes(field.name) && userData[field.name]) {
            console.log(field.name);
            if (field.name === "timeslots") {
                document.querySelector(`input[name="timeslots"][value="${field.value}"]`).checked = userData.timeslots[field.value];
            } else if (["checkbox"].includes(field.element) && field.name !== "timeslots") {
                document.querySelector(`input[value="${field.value}"]`).checked = userData[field.value];
            } else if (["radio"].includes(field.element)) {
                document.querySelector(`input[value=${userData[field.name]}]`).checked = true;
            } else {
                document.getElementById(field.name).value = userData[field.name];
            };
        };
    });
}

async function submitButtonClicked(playerId) {
    cacheUserData(currentPageNumber);
    console.log(userData);
    const result = await sendPlayerToServer(userData, playerId ? playerId : 0, false);
    if (result.success) {
        userId = result.newDataId;
        joinFormHeight = joinForm.scrollHeight;
        shrinkFormHeight();

        prepareFormPage(4);

    } else {
        joinForm.innerHTML = result.message;
    }
}

async function generateFormButtons() {
    joinForm.appendChild(buttonContainer);
    buttonContainer.id = "buttonContainer";
    buttonContainer.className = "button-container";
    
    for (const buttonKey in riveButtons) {
        const button = riveButtons[buttonKey];
        button.canvas = createCanvas(buttonKey + "Canvas", buttonContainer.id);
        button.rive = await loadRiveButton(button);
        button.canvas.style.display = button.pages.includes(currentPageNumber) ? "flex" : "none";
        
    };

    riveButtons.toGameSelection.rive.layout = new window.rive.Layout({
        fit: window.rive.Fit.FitWidth,
    });
    riveButtons.toGameSelection.rive.resizeDrawingSurfaceToCanvas();
}

async function gameSelectionButtonClicked() {
    joinForm.innerHTML = "";
    joinForm.appendChild(gameCardsContainer);
    gameCardsContainer.appendChild(gameCardsCanvas);
    joinForm.appendChild(buttonContainer);
    
    try {
        await loadCardInstances();
    } catch (error) {
        console.error("Die Karten konnten nicht geladen werden:", error);
        return;
    }


    shrinkFormHeight();

    joinFormHeight = joinForm.scrollHeight;

    setFormHeight("0.6s", joinForm.scrollHeight);
}

async function start() {
    
    await loadData();
    nerdyCanvas = createCanvas("nerdyCanvas", "body");
    nerdy = loadNerdy(nerdyCanvas.id, "body");

    initializeNerdyDrag(nerdyCanvas);

    gameCardsContainer.id = "gameCardsContainer";
    gameCardsContainer.className = "game-cards-container";
    gameCardsCanvas.id = "gameCardsCanvas";
    gameCardsCanvas.className = "game-cards-canvas";

    await generateFormButtons();

    formContainer.id = "formContainer";
    formContainer.className = "form-container";
    joinFormHeight = joinForm.scrollHeight;
    riveButtons.letsGo.rive.resizeDrawingSurfaceToCanvas();
    setTimeout(() => {
        setFormHeight("0.6s", joinFormHeight);
    }, 200);
    
    //addDataToDatabaseButton(fieldsWithoutID, "joinForm", "addPlayerToDatabaseButton", "Anmelden", "", "Spieler", sendPlayerToServer, true);
    //createGamesOptions(fields);

    //addResizeListener();

    //loadCardInstances();

}

start();