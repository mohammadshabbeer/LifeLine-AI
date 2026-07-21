const ICONS = {
  success: "✓",
  error: "!",
  warning: "⚠",
  info: "i"
};

const TITLES = {
  success: "Success",
  error: "Action failed",
  warning: "Attention",
  info: "LifeLine AI"
};

function getContainer() {
  let container = document.getElementById("lifelineToastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "lifelineToastContainer";
    container.setAttribute("aria-live", "polite");
    document.body.appendChild(container);
  }
  return container;
}

function inferType(message) {
  const value = String(message || "").toLowerCase();
  if (/failed|error|not found|denied|cannot|rejected|❌/.test(value)) return "error";
  if (/warning|wait|pending|not accepted|⚠/.test(value)) return "warning";
  if (/success|sent|assigned|accepted|completed|deleted|✅|🚑/.test(value)) return "success";
  return "info";
}

export function showToast(message, type = "info", options = {}) {
  const safeType = ["success", "error", "warning", "info"].includes(type) ? type : "info";
  const duration = Math.max(1800, Number(options.duration || 4000));
  const toast = document.createElement("article");
  toast.className = `lifeline-toast ${safeType}`;
  toast.style.setProperty("--toast-duration", `${duration}ms`);

  const icon = document.createElement("div");
  icon.className = "lifeline-toast-icon";
  icon.textContent = ICONS[safeType];

  const content = document.createElement("div");
  const title = document.createElement("h4");
  title.className = "lifeline-toast-title";
  title.textContent = options.title || TITLES[safeType];
  const text = document.createElement("p");
  text.className = "lifeline-toast-message";
  text.textContent = String(message || "Notification");
  content.append(title, text);

  const close = document.createElement("button");
  close.className = "lifeline-toast-close";
  close.type = "button";
  close.setAttribute("aria-label", "Close notification");
  close.textContent = "×";

  const progress = document.createElement("div");
  progress.className = "lifeline-toast-progress";
  toast.append(icon, content, close, progress);
  getContainer().appendChild(toast);

  const dismiss = () => {
    if (toast.classList.contains("hide")) return;
    toast.classList.remove("show");
    toast.classList.add("hide");
    window.setTimeout(() => toast.remove(), 340);
  };

  close.addEventListener("click", dismiss);
  requestAnimationFrame(() => toast.classList.add("show"));
  window.setTimeout(dismiss, duration);
  return toast;
}

window.showToast = showToast;
window.lifeLineToast = {
  success: (message, options) => showToast(message, "success", options),
  error: (message, options) => showToast(message, "error", options),
  warning: (message, options) => showToast(message, "warning", options),
  info: (message, options) => showToast(message, "info", options)
};

// Safely modernize existing alert() calls without changing their business logic.
const nativeAlert = window.alert.bind(window);
window.nativeAlert = nativeAlert;
window.alert = (message) => showToast(message, inferType(message));
