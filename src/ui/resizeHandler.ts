
export function resizeHandler() {
    const handle = document.getElementById('drag-handle');
    const leftPanel = document.getElementById('traffic-panel');
    const rightPanel = document.getElementById('detail-panel');
    const container = document.querySelector('.container') as HTMLElement;

    if (!handle || !leftPanel || !rightPanel || !container) return;

    let isDragging = false;

    handle.addEventListener('mousedown', (e) => {
        isDragging = true;
        document.body.style.cursor = 'col-resize';
        e.preventDefault(); // Prevent text selection
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        // Calculate new width for the left panel logic
        const containerRect = container.getBoundingClientRect();
        const newLeftWidth = e.clientX - containerRect.left;

        // Min width constraints
        if (newLeftWidth < 100) return;
        if (newLeftWidth > containerRect.width - 100) return;

        leftPanel.style.width = `${newLeftWidth}px`;
        leftPanel.style.flex = 'none'; // distinct width set
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            document.body.style.cursor = '';
        }
    });
}
