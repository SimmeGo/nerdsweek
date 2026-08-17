const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
        updateAngle(entry.target);
    }
});

function updateAngle(element) {
    const rect = element.getBoundingClientRect();
    const angle = 180 - Math.atan2(rect.height, rect.width) * 180 / Math.PI;
    console.log(`Der Winkel ist ${angle} Grad groß.`);
    element.style.setProperty("--edge-angle", `${angle}deg`);
}

export function setupInnerEdge(element) { 
    requestAnimationFrame(() => {
        updateAngle(element);
        observer.observe(element);
    });
}