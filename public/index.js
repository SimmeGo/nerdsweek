import { createButton } from "./shared/forms.js";
import { checkLogin, checkLoginStatus } from "./shared/user_management.js";

let nerdy;
let scaleFactor = 0.1;
const mainWidth = 11130;
const mainHeight = 6615;

const smallArtboardWidth = 5880;
const smallArtboardHeight = 8909;
const wideArtboardWidth = 11130;
const wideArtboardHeight = 8909;
let usedArtboardWidth;
let usedArtboardHeight;

function addResizeListener() {
    const riveFrame = document.getElementById("nerdyFrame");

    let lastWidth = 0;
    let resizeFrame;

    const observer = new ResizeObserver(([entry]) => {
        const width = Math.round(entry.contentRect.width);
        // Browser-Leisten o. Ä. haben die Breite nicht verändert
        if (width === lastWidth) return;

        lastWidth = width;

        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => {
            //updateRiveHeight();
            updateLayout(width);
        });
    });

    observer.observe(riveFrame);
}

function updateLayout(width) {
    if (!Number.isFinite(width) || width <= 0) return;

    const canvas = document.getElementById("nerdyCanvas");
    const isMobile = width < 700;

    if (width > 1000) width = 900;

    const artboardWidth = isMobile
        ? smallArtboardWidth
        : wideArtboardWidth;

    const artboardHeight = isMobile
        ? smallArtboardHeight
        : wideArtboardHeight;

    if (
        !Number.isFinite(artboardWidth) || artboardWidth <= 0 ||
        !Number.isFinite(artboardHeight) || artboardHeight <= 0
    ) {
        console.error("Ungültige Artboardgröße", {
            artboardWidth,
            artboardHeight
        });
        return;
    }

    const usedWidth = isMobile ? width - 60 : width - 30;

    const factor = width / artboardWidth;

    canvas.style.display = "block";
    canvas.style.width = `${width}px`;
    canvas.style.height = `${artboardHeight * factor}px`;

    nerdy.layout = new rive.Layout({
        fit: rive.Fit.Layout,
        layoutScaleFactor: factor
    });

    nerdy.resizeDrawingSurfaceToCanvas();
    nerdy.setupRiveListeners();
}

function loadNerdy() {
    const canvas = document.getElementById("nerdyCanvas");
    nerdy = new rive.Rive({
        src: "/assets/rive_files/nerdy.riv",
        // OR the path to a discoverable and public Rive asset
        // src: '/public/example.riv',
        canvas: document.getElementById("nerdyCanvas"),
        artboard: "Main",
        stateMachine: "State Machine 1",
        autoplay: true,
        autoBind: true,
        isTouchScrollEnabled: true,
        useOffscreenRenderer: true,
        layout: new rive.Layout({
            layoutScaleFactor: scaleFactor,
            fit: rive.Fit.Layout,
        }),
        onLoad: () => {
            console.log(nerdy.contents?.artboards);
            const menuInstance = nerdy.viewModelInstance;
            const joinClicked = menuInstance.trigger("leftClicked");
            const nerdsClicked = menuInstance.trigger("middleClicked");
            const infoClicked = menuInstance.trigger("rightClicked");

            joinClicked.on(() => window.location.href = "/join");
            //nerdsClicked.on(() => window.location.href = "/nerds");
            //infoClicked.on(() => window.location.href = "/info");

            addResizeListener();
            //const width = Math.round(entry.contentRect.width);
            //updateLayout(width);
        },
    });
}

checkLoginStatus();
loadNerdy();