const SPLASH_SESSION_KEY = "lifeline-splash-shown";

function createSplash() {
  if (document.getElementById("lifelineSplash")) return;

  const splash = document.createElement("div");
  splash.id = "lifelineSplash";
  splash.setAttribute("role", "status");
  splash.setAttribute("aria-label", "LifeLine AI is loading");
  splash.innerHTML = `
    <div class="lifeline-splash-orb one"></div>
    <div class="lifeline-splash-orb two"></div>
    <div class="lifeline-splash-card">
      <div class="lifeline-splash-logo">🚑</div>
      <h1>LifeLine AI</h1>
      <p>AI-Powered Emergency Response & Hospital ERP</p>
      <div class="lifeline-splash-status" id="lifelineSplashStatus">Connecting emergency services...</div>
      <div class="lifeline-splash-track"><div class="lifeline-splash-progress"></div></div>
      <div class="lifeline-splash-footer">Secure • Real-time • Life-saving</div>
    </div>`;
  document.body.prepend(splash);

  const messages = [
    "Connecting emergency services...",
    "Preparing live hospital network...",
    "Loading LifeLine AI..."
  ];
  let index = 0;
  const status = splash.querySelector("#lifelineSplashStatus");
  const messageTimer = window.setInterval(() => {
    index = Math.min(index + 1, messages.length - 1);
    status.textContent = messages[index];
  }, 720);

  window.setTimeout(() => {
    window.clearInterval(messageTimer);
    splash.classList.add("lifeline-splash-hide");
    sessionStorage.setItem(SPLASH_SESSION_KEY, "true");
    window.setTimeout(() => splash.remove(), 560);
  }, 2450);
}

if (!sessionStorage.getItem(SPLASH_SESSION_KEY)) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createSplash, { once: true });
  } else {
    createSplash();
  }
}
