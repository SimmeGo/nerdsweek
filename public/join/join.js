import { sendPlayerToServer, refreshValues, getValues } from "../shared/data_management.js";
import { addDataToDatabaseButton, createGamesOptions, createFieldsForPlayer, setHexColor } from "../shared/forms.js";

let games = [];
let players = [];
let gameCards = [];

let rankFields = [];
let fieldsWithoutID;
let riveGameCards;

const fields = [
        { name: "id", label: "ID", get: player => player.id },
        { element: "input", type: "text", name: "name", label: "Vorname", get: player => player.firstName, mandatory: true},
        { element: "input", type: "text", name: "surname", label: "Nachname", get: player => player.lastName, mandatory: true}
    ]

const isMobile = matchMedia(
  "(max-width: 700px) and (pointer: coarse)"
).matches;

const scaleFactor = isMobile ? 0.6 : 1;

function updateRiveHeight(scaleFactor, cardCount, riveAnimation) {
    const cardWidth = 291 * scaleFactor;
    const cardHeight = 374 * scaleFactor;
    const gap = 0;
    const padding = 20;
    
    const riveFrame = document.getElementById("riveFrame");
    
    const usableWidth = riveFrame.clientWidth //- padding * 2 - gap * cardCount;
    const columns = Math.max(
        1,
        Math.floor((usableWidth) / (cardWidth)),
        );

    const rows = Math.ceil(cardCount / columns);

    console.log(`width: ${cardWidth}`, `height: ${cardHeight}`, `div: ${riveFrame}`, `windowWidth: ${usableWidth}`, `columns: ${columns}`, `rows: ${rows}`);

    riveFrame.style.height =
        `${padding * 2 + rows * cardHeight + (rows - 1) * gap}px`;
    
        console.log(riveFrame.style.width);

    riveAnimation.resizeDrawingSurfaceToCanvas();
}
 
async function loadRiveImage(url) {
    const response = await fetch(url);
    const bytes = new Uint8Array(await response.arrayBuffer());

    return window.rive.decodeImage(bytes);
}

function addResizeListener() {
    const riveFrame = document.getElementById("riveFrame");

    let lastWidth = 0;
    let resizeFrame;

    const observer = new ResizeObserver(([entry]) => {
        const width = Math.round(entry.contentRect.width);

        if (width === lastWidth) return;

        lastWidth = width;

        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => {
            updateRiveHeight(scaleFactor, gameCards.length, riveGameCards);
            riveGameCards.resizeDrawingSurfaceToCanvas();
        });
    });

    observer.observe(riveFrame);
}

async function loadData() {
    fields = createFieldsForPlayer();
    fieldsWithoutID = fields.slice(1);
    await refreshValues("gameCards");
    gameCards = await getValues("gameCards");
    await refreshValues("games");
    games = await getValues("games");
    await refreshValues("players");
    players = await getValues("players");
}

function loadRiveInstances() {
    riveGameCards = new rive.Rive({
        src: "/assets/rive_files/GameOverview.riv",
        // OR the path to a discoverable and public Rive asset
        // src: '/public/example.riv',
        canvas: document.getElementById("riveCanvas"),
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
            const supportsHover = window.matchMedia(
                "(hover: hover) and (pointer: fine)"
            ).matches;
            clearGameCards();
            loadGameCards(supportsHover);
            updateRiveHeight(scaleFactor, gameCards.length, riveGameCards);
            riveGameCards.resizeDrawingSurfaceToCanvas();
        },
    });
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
    console.log(gamesList);
    const gameCardVM = riveGameCards.viewModelByName("GameCard");
    const rankVM = riveGameCards.viewModelByName("RankingCircles");
    console.log(gameCards);

    for (const gameCard of gameCards) {
        const card = gameCardVM.instance();
        const noCircle = riveGameCards.viewModelByName("RankingCircles").instanceByName("excluded");

        card.string("currentRankText").value = "0";
        card.boolean("cardClicked").value = false;
        card.boolean("hoverEnabled").value = supportsHover;
        console.log(card.boolean("hoverEnabled").value);
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

        /*card.color("primaryGameColor").value = gameCard.primaryGameColor;
        card.color("secondaryGameColor").value = gameCard.secondaryGameColor;
        card.color("highlightGameColor").value = gameCard.highlightGameColor;*/
        card.number("deltaRank").value = 0;
        card.number("previousRank").value = 0;
        card.number("currentRank").value = 0;
        card.boolean("selectionLocked").value = true;

        console.log(card);
        gamesList.addInstance(card);
    }
}

async function start() {
    loadData();
    
    addDataToDatabaseButton(fieldsWithoutID, "joinForm", "addPlayerToDatabaseButton", "Anmelden", "", "Spieler", sendPlayerToServer, true);
    createGamesOptions(fields);

    addResizeListener();

    loadRiveInstances();

}

start();