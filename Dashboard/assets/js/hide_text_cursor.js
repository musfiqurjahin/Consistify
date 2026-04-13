(function () {
    // Create a global style to hide caret everywhere
    const style = document.createElement('style');
    style.innerHTML = `
        * {
            caret-color: transparent !important;
        }

        input, textarea, [contenteditable="true"] {
            caret-color: transparent !important;
        }
    `;
    document.head.appendChild(style);

    // Optional: remove focus to stop cursor appearing
    document.addEventListener('focusin', (e) => {
        if (
            e.target.tagName === 'INPUT' ||
            e.target.tagName === 'TEXTAREA' ||
            e.target.isContentEditable
        ) {
            setTimeout(() => {
                e.target.blur();
            }, 0);
        }
    });
})();