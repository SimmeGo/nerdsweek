export function loadNerdy(canvas, frame) {
    const nerdy = new rive.Rive({
        src: "/assets/rive_files/nerdy.riv",
        // OR the path to a discoverable and public Rive asset
        // src: '/public/example.riv',
        canvas: document.getElementById(canvas),
        artboard: "Nerdy",
        stateMachine: "Idle",
        autoplay: true,
        autoBind: true,
        isTouchScrollEnabled: true,
        useOffscreenRenderer: true,
        layout: new rive.Layout({
            fit: rive.Fit.FitHeight,
        }),
        onLoad: () => {
            console.log(nerdy.contents?.artboards);
            addResizeListener(frame, nerdy);
            //const width = Math.round(entry.contentRect.width);
            //updateLayout(width);
        },
    });

    return nerdy;
}

export function addResizeListener(frame, animation, gameCards) {
    const riveFrame = document.getElementById(frame);

    let lastWidth = 0;
    let resizeFrame;

    const observer = new ResizeObserver(([entry]) => {
        const width = Math.round(entry.contentRect.width);

        if (width === lastWidth) return;

        lastWidth = width;

        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => {
            if (gameCards) updateRiveHeight(scaleFactor, gameCards.length, animation);
            animation.resizeDrawingSurfaceToCanvas();
        });
    });

    observer.observe(riveFrame);


}

export function initializeNerdyDrag(nerdy) {
    let startX;
    let startY;

    let startLeft;
    let startTop;

    let isDragged = false;
    let pointerId;

    nerdy.addEventListener("pointerdown", startNerdyDrag);
    nerdy.addEventListener("pointermove", moveNerdyDrag);
    nerdy.addEventListener("pointerup", endNerdyDrag);
    nerdy.addEventListener("pointercancel", endNerdyDrag);

    function startNerdyDrag(event) {
        if (event.button !== 0) return;
        const nerdy = event.currentTarget;
        pointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;
        startLeft = nerdy.offsetLeft;
        startTop = nerdy.offsetTop;
    
        nerdy.setPointerCapture(pointerId);
    
        isDragged = true;
    }
    
    function moveNerdyDrag(event) {
        if (!isDragged) return;
    
        const nerdy = event.currentTarget;
        nerdy.style.left = `${startLeft + event.clientX - startX}px`;
        nerdy.style.top = `${startTop + event.clientY - startY}px`;
    }
    
    function endNerdyDrag(event) {
        isDragged = false;
        const nerdy = event.currentTarget;
        nerdy.style.transform = "none";
    }
}
