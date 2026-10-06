import { db } from "../firebase/firebase-config.js";

import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

let latitude = 17.3850;
let longitude = 78.4867;
let unsubscribeEmergencyStatus = null;
let sosCountdownTimer = null;
let sosCountdownValue = 5;
let sosSending = false;

const DEFAULT_POSITION = { lat: 17.3850, lng: 78.4867 };

// Coordinates match the hospitals already available in the project. The
// nearest one is selected with the Haversine distance formula.
const SOS_HOSPITALS = Object.freeze([
  { name: "City Hospital", lat: 16.5062, lng: 80.6480 },
  { name: "Apollo Hospital", lat: 16.5048, lng: 80.6466 },
  { name: "Care Hospital", lat: 16.5098, lng: 80.6416 },
  { name: "Yashoda Hospital", lat: 16.5184, lng: 80.6379 }
]);

const map = L.map("map").setView([latitude, longitude], 13);

L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  { attribution: "© OpenStreetMap" }
).addTo(map);

let marker = L.marker([latitude, longitude]).addTo(map);

function safeElement(id) {
  return document.getElementById(id);
}

function activateProgress(stepCount) {
  const steps = [
    "stepPending",
    "stepAccepted",
    "stepDispatch",
    "stepArrived",
    "stepCompleted"
  ];
  const lines = ["line1", "line2", "line3", "line4"];

  document.querySelectorAll(".step, .line").forEach((element) => {
    element.classList.remove("active");
  });

  steps.slice(0, stepCount).forEach((id) => {
    safeElement(id)?.classList.add("active");
  });

  lines.slice(0, Math.max(0, stepCount - 1)).forEach((id) => {
    safeElement(id)?.classList.add("active");
  });
}

function normalizeStatus(data) {
  const systemStatus = String(data.status || "").trim().toLowerCase();
  const driverStatus = String(data.driverStatus || "").trim().toLowerCase();
  const hospitalStatus = String(data.hospitalStatus || "").trim().toLowerCase();
  const isDriverAssigned = Boolean(data.driverAssigned || data.assignedDriver || data.driverId);

  if (systemStatus === "completed" || driverStatus === "completed") return "Completed";
  if (systemStatus === "rejected" || driverStatus === "rejected") return "Rejected";
  if (systemStatus === "arrived" || driverStatus === "arrived") return "Arrived";
  if (["dispatched", "en route", "enroute"].includes(systemStatus) ||
      ["dispatched", "en route", "enroute"].includes(driverStatus)) return "Dispatched";
  if (systemStatus === "accepted" || driverStatus === "accepted" ||
      systemStatus === "driver accepted" || systemStatus === "driver assigned" ||
      driverStatus === "assigned" || hospitalStatus === "accepted" || isDriverAssigned) return "Accepted";
  return "Pending";
}


function renderLiveStatus(data) {
  const status = normalizeStatus(data);
  const prefix = data.isSOS ? "🆘 SOS: " : "";
  let message = `${prefix}🟡 Hospital is reviewing your request`;

  switch (status) {
    case "Accepted":
      message = data.assignedDriver
        ? `${prefix}✅ Request accepted. Driver ${data.assignedDriver} is assigned.`
        : `${prefix}✅ Hospital accepted your request`;
      activateProgress(2);
      break;
    case "Dispatched":
      message = `${prefix}🚑 Ambulance is coming to your location.`;
      activateProgress(3);
      break;
    case "Arrived":
      message = `${prefix}🚑 Your ambulance has arrived at your location.`;
      activateProgress(4);
      if (!sessionStorage.getItem("arrivalShown")) {
        sessionStorage.setItem("arrivalShown", "true");
        if (typeof window.showArrivalPopup === "function") window.showArrivalPopup();
      }
      break;
    case "Completed":
      message = `${prefix}✅ Emergency response completed.`;
      activateProgress(5);
      break;
    case "Rejected":
      message = `${prefix}❌ Emergency request rejected.`;
      activateProgress(1);
      break;
    default:
      activateProgress(1);
  }

  const liveStatus = safeElement("liveStatus");
  if (liveStatus) liveStatus.textContent = message;
}

function subscribeToEmergencyStatus(emergencyId) {
  if (unsubscribeEmergencyStatus) {
    unsubscribeEmergencyStatus();
    unsubscribeEmergencyStatus = null;
  }

  if (!emergencyId) {
    activateProgress(0);
    return;
  }

  unsubscribeEmergencyStatus = onSnapshot(
    doc(db, "alerts", emergencyId),
    (snapshot) => {
      if (!snapshot.exists()) {
        localStorage.removeItem("currentEmergency");
        const liveStatus = safeElement("liveStatus");
        if (liveStatus) liveStatus.textContent = "No active emergency request.";
        activateProgress(0);
        return;
      }

      const data = snapshot.data();
      renderLiveStatus(data);

      if (["Completed", "Rejected"].includes(normalizeStatus(data))) {
        window.setTimeout(() => {
          if (localStorage.getItem("currentEmergency") === emergencyId) {
            localStorage.removeItem("currentEmergency");
          }
        }, 30000);
      }
    },
    (error) => {
      console.error("Emergency status listener failed:", error);
      const liveStatus = safeElement("liveStatus");
      if (liveStatus) liveStatus.textContent = "Unable to receive live status updates.";
    }
  );
}

function getCurrentUserSession() {
  try {
    return JSON.parse(sessionStorage.getItem("lifeline-auth-session") || "null");
  } catch {
    return null;
  }
}

function setSosState(message, type = "sending") {
  const state = safeElement("sosState");
  if (!state) return;
  state.textContent = message;
  state.className = `sos-state show ${type}`;
}

function toRadians(value) {
  return value * Math.PI / 180;
}

function distanceKm(lat1, lng1, lat2, lng2) {
  const radius = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearestHospital(lat, lng) {
  return SOS_HOSPITALS
    .map((hospital) => ({
      ...hospital,
      distance: distanceKm(lat, lng, hospital.lat, hospital.lng)
    }))
    .sort((a, b) => a.distance - b.distance)[0];
}

function getPrecisePosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported on this device."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 15000
      }
    );
  });
}

async function reverseGeocode(lat, lng) {
  const fallback = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { signal: controller.signal, headers: { "Accept": "application/json" } }
    );
    window.clearTimeout(timeout);
    if (!response.ok) return fallback;
    const data = await response.json();
    return data.display_name || fallback;
  } catch {
    return fallback;
  }
}

function updateMapPosition(lat, lng) {
  latitude = lat;
  longitude = lng;
  marker.setLatLng([lat, lng]);
  map.setView([lat, lng], 16);
}

function closeSosConfirmation() {
  if (sosCountdownTimer) {
    window.clearInterval(sosCountdownTimer);
    sosCountdownTimer = null;
  }
  safeElement("sosConfirmOverlay")?.classList.remove("show");
  safeElement("sosConfirmOverlay")?.setAttribute("aria-hidden", "true");
}

async function sendSmartSos() {
  if (sosSending) return;
  sosSending = true;
  closeSosConfirmation();

  const button = safeElement("smartSosBtn");
  if (button) button.disabled = true;

  try {
    setSosState("📍 Detecting your precise location...", "sending");
    navigator.vibrate?.([180, 80, 180]);

    const position = await getPrecisePosition();
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const accuracy = Math.round(position.coords.accuracy || 0);
    updateMapPosition(lat, lng);

    setSosState("🧠 AI is selecting the nearest hospital...", "sending");
    const [address, nearestHospital] = await Promise.all([
      reverseGeocode(lat, lng),
      Promise.resolve(findNearestHospital(lat, lng))
    ]);

    const session = getCurrentUserSession();
    const patientName = "Unknown Patient (SOS)";

    setSosState(`🚨 Sending critical SOS to ${nearestHospital.name}...`, "sending");

    const docRef = await addDoc(collection(db, "alerts"), {
      patientName,
      phone: session?.phone || "Not available - SOS",
      emergencyType: "Critical SOS Emergency",
      symptoms: "One-tap SOS activated. Patient may be unable to provide details. Immediate assistance required.",
      location: address,
      address: address,
      latitude: lat,
      longitude: lng,
      lat: lat,
      lng: lng,
      coordinates: {
        latitude: lat,
        longitude: lng
      },
      googleMapsUrl: `https://www.google.com/maps?q=${lat},${lng}`,
      locationAccuracyMeters: accuracy,
      hospital: nearestHospital.name,
      nearestHospitalDistanceKm: Number(nearestHospital.distance.toFixed(2)),
      status: "Pending",
      hospitalStatus: "Pending",
      driverStatus: "Not Assigned",
      driverAssigned: false,
      assignedDriver: "",
      severity: "Critical",
      severityScore: 100,
      priority: "Critical",
      isSOS: true,
      sosMode: "ONE_TAP_AI_SOS",
      requiresImmediateResponse: true,
      aiTriage: {
        classification: "Critical",
        confidence: 1,
        reason: "One-tap SOS activated without medical details",
        recommendedAction: "Dispatch nearest available ambulance immediately"
      },
      source: "Smart AI SOS",
      userId: session?.uid || null,
      timestamp: serverTimestamp()
    });

    localStorage.setItem("currentEmergency", docRef.id);
    sessionStorage.removeItem("arrivalShown");
    subscribeToEmergencyStatus(docRef.id);

    const hospitalSelect = safeElement("hospital");
    if (hospitalSelect) hospitalSelect.value = nearestHospital.name;
    const locationInput = safeElement("location");
    if (locationInput) locationInput.value = address;

    setSosState(
      `✅ SOS sent to ${nearestHospital.name} (${nearestHospital.distance.toFixed(1)} km away). Keep this page open for live status.`,
      "success"
    );
    navigator.vibrate?.([250, 100, 250, 100, 450]);
  } catch (error) {
    console.error("Smart SOS failed:", error);
    const permissionDenied = error?.code === 1;
    setSosState(
      permissionDenied
        ? "❌ Location permission is required to send Smart SOS. Enable location and try again."
        : `❌ SOS could not be sent: ${error.message || "Please try again."}`,
      "error"
    );
  } finally {
    sosSending = false;
    if (button) button.disabled = false;
  }
}

function openSosConfirmation() {
  if (sosSending) return;
  sosCountdownValue = 5;
  const countdown = safeElement("sosCountdown");
  if (countdown) countdown.textContent = String(sosCountdownValue);
  const overlay = safeElement("sosConfirmOverlay");
  overlay?.classList.add("show");
  overlay?.setAttribute("aria-hidden", "false");

  sosCountdownTimer = window.setInterval(() => {
    sosCountdownValue -= 1;
    if (countdown) countdown.textContent = String(Math.max(0, sosCountdownValue));
    if (sosCountdownValue <= 0) sendSmartSos();
  }, 1000);
}

safeElement("smartSosBtn")?.addEventListener("click", openSosConfirmation);
safeElement("sosSendNow")?.addEventListener("click", sendSmartSos);
safeElement("sosCancel")?.addEventListener("click", () => {
  closeSosConfirmation();
  setSosState("SOS cancelled. No emergency was sent.", "error");
});
safeElement("sosConfirmOverlay")?.addEventListener("click", (event) => {
  if (event.target === safeElement("sosConfirmOverlay")) closeSosConfirmation();
});

safeElement("gpsBtn")?.addEventListener("click", async () => {
  try {
    const position = await getPrecisePosition();
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    updateMapPosition(lat, lng);
    safeElement("location").value = await reverseGeocode(lat, lng);
  } catch {
    alert("Location permission denied.");
  }
});

safeElement("emergencyForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const docRef = await addDoc(collection(db, "alerts"), {
      patientName: safeElement("name").value,
      phone: safeElement("phone").value,
      emergencyType: safeElement("emergencyType").value,
      symptoms: safeElement("symptoms").value,
      location: safeElement("location").value,
      latitude,
      longitude,
      hospital: safeElement("hospital").value,
      status: "Pending",
      hospitalStatus: "Pending",
      driverStatus: "Not Assigned",
      driverAssigned: false,
      assignedDriver: "",
      isSOS: false,
      source: "Detailed Emergency Form",
      timestamp: serverTimestamp()
    });

    localStorage.setItem("currentEmergency", docRef.id);
    sessionStorage.removeItem("arrivalShown");
    subscribeToEmergencyStatus(docRef.id);

    alert("🚑 Emergency Request Sent Successfully");
    event.target.reset();
    safeElement("location").value = "";
    latitude = DEFAULT_POSITION.lat;
    longitude = DEFAULT_POSITION.lng;
    marker.setLatLng([latitude, longitude]);
    map.setView([latitude, longitude], 13);
  } catch (error) {
    console.error(error);
    alert("Submission Failed");
  }
});

subscribeToEmergencyStatus(localStorage.getItem("currentEmergency"));

window.addEventListener("storage", (event) => {
  if (event.key === "currentEmergency") subscribeToEmergencyStatus(event.newValue);
});
