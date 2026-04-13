// Disable caret globally
document.addEventListener("DOMContentLoaded", () => {
  const style = document.createElement("style");
  style.innerHTML = `
    * {
      caret-color: transparent !important;
    }
  `;
  document.head.appendChild(style);
});