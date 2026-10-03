const TOAST_DURATION_MS = 4000;

let toastElement: HTMLElement | null = null;
let hideTimer: number | null = null;

// Shows a short message in the lower right corner that disappears by itself.
export function showToast(text: string): void {
    if (!toastElement) {
        toastElement = document.createElement("div");
        toastElement.className = "toast";
        toastElement.setAttribute("role", "status");
        document.body.appendChild(toastElement);
    }

    toastElement.textContent = text;
    toastElement.classList.remove("hidden");

    if (hideTimer !== null) {
        clearTimeout(hideTimer);
    }
    hideTimer = window.setTimeout(hideToast, TOAST_DURATION_MS);
}

function hideToast(): void {
    if (toastElement) {
        toastElement.classList.add("hidden");
    }
    hideTimer = null;
}
