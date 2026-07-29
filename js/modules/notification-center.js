import { db } from "../firebase/firebase-config.js";
import {
  collection,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getCurrentHospital, isAlertForHospital } from "./hospital-session.js";
import { showToast } from "./toast.js";

const STORAGE_PREFIX = "lifeline-notifications";
const currentHospital = getCurrentHospital();
if (!currentHospital) {
  console.warn("Notification center disabled: no hospital session.");
} else {
  startNotificationCenter(currentHospital);
}

function startNotificationCenter(hospital) {
  const storageKey = `${STORAGE_PREFIX}:${hospital.id || hospital.name}`;
  let saved = readSaved(storageKey);
  let initialized = false;

  const host = document.createElement("div");
  host.className = "lifeline-notification-host";
  host.innerHTML = `
    <button class="lifeline-notification-button" type="button" aria-label="Open notifications" aria-expanded="false">
      🔔<span class="lifeline-notification-badge" hidden>0</span>
    </button>
    <section class="lifeline-notification-panel" aria-label="Notification center">
      <div class="lifeline-notification-header">
        <h3>Notifications</h3>
        <div class="lifeline-notification-actions">
          <button type="button" data-action="read">Mark all read</button>
          <button type="button" data-action="clear">Clear</button>
        </div>
      </div>
      <div class="lifeline-notification-list"></div>
    </section>`;
  document.body.appendChild(host);

  const trigger = host.querySelector(".lifeline-notification-button");
  const badge = host.querySelector(".lifeline-notification-badge");
  const panel = host.querySelector(".lifeline-notification-panel");
  const list = host.querySelector(".lifeline-notification-list");

  trigger.addEventListener("click", () => {
    const open = panel.classList.toggle("open");
    trigger.setAttribute("aria-expanded", String(open));
    if (open) markAllRead();
  });

  host.querySelector('[data-action="read"]').addEventListener("click", markAllRead);
  host.querySelector('[data-action="clear"]').addEventListener("click", () => {
    saved = [];
    persist();
    render();
    showToast("Notification history cleared.", "info");
  });

  document.addEventListener("click", (event) => {
    if (!host.contains(event.target)) {
      panel.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    }
  });

  function markAllRead() {
    saved = saved.map(item => ({ ...item, read: true }));
    persist();
    render();
  }

  function persist() {
    localStorage.setItem(storageKey, JSON.stringify(saved.slice(0, 40)));
  }

  function addNotification(item, displayToast = false) {
    if (saved.some(existing => existing.key === item.key)) return;
    saved.unshift(item);
    saved = saved.slice(0, 40);
    persist();
    render();
    if (displayToast) showToast(item.message, item.type, { title: item.title });
  }

  function render() {
    const unread = saved.filter(item => !item.read).length;
    badge.textContent = unread > 99 ? "99+" : String(unread);
    badge.hidden = unread === 0;

    if (!saved.length) {
      list.innerHTML = `<div class="lifeline-notification-empty"><span>🔕</span>No notifications yet</div>`;
      return;
    }

    list.innerHTML = saved.map(item => `
      <article class="lifeline-notification-item ${item.read ? "" : "unread"}">
        <div class="lifeline-notification-item-icon">${escapeHtml(item.icon)}</div>
        <div>
          <h4>${escapeHtml(item.title)}</h4>
          <p>${escapeHtml(item.message)}</p>
          <span class="lifeline-notification-time">${formatTime(item.createdAt)}</span>
        </div>
      </article>`).join("");
  }

  render();

  const alertsQuery = query(collection(db, "alerts"), orderBy("timestamp", "desc"));
  onSnapshot(alertsQuery, snapshot => {
    snapshot.docChanges().forEach(change => {
      const data = change.doc.data();
      if (!isAlertForHospital(data, hospital)) return;

      const previous = change.doc.metadata?.hasPendingWrites ? null : saved;
      const item = makeNotification(change.doc.id, data, change.type);
      if (!item) return;
      addNotification(item, initialized && change.type !== "removed" && Boolean(previous));
    });
    initialized = true;
  }, error => {
    console.error("Notification listener error:", error);
    showToast("Notification center could not connect to Firestore.", "error");
  });
}

function makeNotification(id, data, changeType) {
  const status = data.status || "Pending";
  const driverStatus = data.driverStatus || "";
  const updatedMarker = timestampValue(data.completedAt || data.dispatchedAt || data.acceptedAt || data.timestamp);
  const key = `${id}:${status}:${driverStatus}:${updatedMarker}:${changeType}`;
  const patient = data.patientName || "Patient";

  if (changeType === "added" && status === "Pending") {
    return notification(key, "🚨", "New emergency", `${patient} requested help for ${data.emergencyType || "an emergency"}.`, "error");
  }
  if (driverStatus === "Accepted") {
    return notification(key, "🚑", "Driver accepted", `${data.driverName || "Assigned driver"} accepted ${patient}'s request.`, "success");
  }
  if (driverStatus === "Rejected") {
    return notification(key, "⚠️", "Driver rejected", `${data.driverName || "The assigned driver"} rejected ${patient}'s request.`, "warning");
  }
  if (status === "Accepted") {
    return notification(key, "🏥", "Emergency accepted", `${patient}'s emergency was accepted by the hospital.`, "success");
  }
  if (status === "Dispatched") {
    return notification(key, "🚑", "Ambulance dispatched", `An ambulance is on the way to ${patient}.`, "info");
  }
  if (status === "Arrived") {
    return notification(key, "📍", "Ambulance arrived", `The ambulance reached ${patient}'s location.`, "success");
  }
  if (status === "Completed") {
    return notification(key, "✅", "Case completed", `${patient}'s emergency case was completed.`, "success");
  }
  if (status === "Rejected") {
    return notification(key, "❌", "Emergency rejected", `${patient}'s emergency request was rejected.`, "error");
  }
  return null;
}

function notification(key, icon, title, message, type) {
  return { key, icon, title, message, type, read: false, createdAt: Date.now() };
}

function readSaved(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function timestampValue(value) {
  if (!value) return "0";
  if (typeof value.toMillis === "function") return String(value.toMillis());
  if (value.seconds) return String(value.seconds);
  if (value instanceof Date) return String(value.getTime());
  return String(value);
}

function formatTime(timestamp) {
  const elapsed = Date.now() - Number(timestamp || Date.now());
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return new Date(timestamp).toLocaleDateString();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[char]);
}
