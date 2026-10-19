import { createCanvas } from "../join/join.js";
import { setHexColor } from "../shared/forms.js";
import { addResizeListener } from "../shared/nerdy.js";


const buttonFile = new rive.RiveFile({
    src: "/assets/rive_files/button.riv",
});

const buttonFileReady = buttonFile.init();

let riveButtons;

const textColor = "#FFFFFF";
const strokeColor = "#905AEE";



export function getRiveButtonStats() {
    return riveButtons;
}

export async function generateFormButtons(form, buttonContainer, buttonConfig) {
    riveButtons = {
        letsGo: {
            canvas: null,
            rive: null,
            text: "Los geht's",
            alignment: rive.Alignment.CenterLeft,
        },
        back: {
            canvas: null,
            rive: null,
            text: "zurück",
            alignment: rive.Alignment.CenterLeft,
        },
        continue: {
            canvas: null,
            rive: null,
            text: "weiter",
            alignment: rive.Alignment.CenterRight,
        },
        submitForm: {
            canvas: null,
            rive: null,
            text: "absenden",
            alignment: rive.Alignment.CenterRight,
        },
        toGameSelection: {
            canvas: null,
            rive: null,
            text: "weiter zur Spieleauswahl",
            alignment: rive.Alignment.CenterRight,
        },
        submitGamePreferences: {
            canvas: null,
            rive: null,
            text: "Spielauswahl bestätigen",
            alignment: rive.Alignment.CenterRight
        }
    };
    form.appendChild(buttonContainer);
    buttonContainer.id = "buttonContainer";
    buttonContainer.className = "button-container";
    
    for (const buttonKey in riveButtons) {
        const button = riveButtons[buttonKey];
        button.onClick = await buttonConfig[buttonKey].onClick;
        button.pages = await buttonConfig[buttonKey].pages;
        button.canvas = createCanvas(buttonKey + "Canvas", buttonContainer.id);
        button.rive = await loadRiveButton(button);
        
    };

    riveButtons.toGameSelection.rive.layout = new window.rive.Layout({
        fit: window.rive.Fit.FitWidth,
    });
    riveButtons.toGameSelection.rive.resizeDrawingSurfaceToCanvas();

    return riveButtons;
}

export function updateButtonDisplayForPage(riveButtons, currentPageNumber) {
    for (const buttonKey in riveButtons) {
        const button = riveButtons[buttonKey];
        button.canvas.style.display = button.pages.includes(currentPageNumber) ? "flex" : "none";
        if (button.canvas.style.display === "none") continue;
        const viewModel = button.rive.viewModelInstance;
        button.rive.stop("State Machine 1");
        button.rive.play("State Machine 1");

        viewModel.boolean("isHovered").value = false;
        if (viewModel) button.rive.bindViewModelInstance(viewModel);

        requestAnimationFrame(() => {
            button.rive.resizeDrawingSurfaceToCanvas();
        });
    };
}

async function loadRiveButton(preferences) {
    await buttonFileReady;

    return new Promise ((resolve, reject) => {

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
                try {
                    adjustAspectRatio(button, preferences);
        
                    customizeButtonInstance(button, preferences.text, textColor, strokeColor);
    
                    addResizeListener("joinForm", button);
        
                    button.resizeDrawingSurfaceToCanvas();
    
                    const buttonInstance = button.viewModelInstance;
                    const clicked = buttonInstance.trigger("isClicked");
                    clicked.on(() => {
                        preferences.onClick();
                    })
                    resolve(button);
                } catch (error) {
                    reject(error);
                };
            },

            onLoadError: reject
        });
    });
}

function adjustAspectRatio(button, preferences) {
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
}

function customizeButtonInstance(riveInstance, text, textColor, strokeColor) {
    const button = riveInstance.viewModelInstance;

    button.boolean("isHovered").value = false;
    setHexColor(button.color("textColor"), textColor);
    setHexColor(button.color("strokeColor"), strokeColor);
    button.string("text").value = text;
}