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

  if (systemStatus === "completed" || driverStatus === "completed") return "Completed";
  if (systemStatus === "rejected" || driverStatus === "rejected") return "Rejected";
  if (systemStatus === "arrived" || driverStatus === "arrived") return "Arrived";
  if (["dispatched", "en route", "enroute"].includes(systemStatus) ||
      ["dispatched", "en route", "enroute"].includes(driverStatus)) return "Dispatched";
  if (systemStatus === "accepted" || driverStatus === "accepted") return "Accepted";
  return "Pending";
}

function renderLiveStatus(data) {
  const status = normalizeStatus(data);
  let message = "🟡 Hospital is reviewing your request";

  switch (status) {
    case "Accepted":
      message = data.assignedDriver
        ? `✅ Request accepted. Driver ${data.assignedDriver} is assigned.`
        : "✅ Hospital accepted your request";
      activateProgress(2);
      break;
    case "Dispatched":
      message = "🚑 Ambulance is coming to your location.";
      activateProgress(3);
      break;
    case "Arrived":
      message = "🚑 Your ambulance has arrived at your location.";
      activateProgress(4);
      if (!sessionStorage.getItem("arrivalShown")) {
        sessionStorage.setItem("arrivalShown", "true");
        if (typeof window.showArrivalPopup === "function") {
          window.showArrivalPopup();
        }
      }
      break;
    case "Completed":
      message = "✅ Treatment completed. Thank you for using LifeLine AI.";
      activateProgress(5);
      break;
    case "Rejected":
      message = "❌ Emergency request rejected.";
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

  const statusRef = doc(db, "alerts", emergencyId);

  unsubscribeEmergencyStatus = onSnapshot(
    statusRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        localStorage.removeItem("currentEmergency");
        safeElement("liveStatus").textContent = "No active emergency request.";
        activateProgress(0);
        return;
      }

      const data = snapshot.data();
      renderLiveStatus(data);

      // Keep the final status visible in the current browser session.
      const finalStatus = normalizeStatus(data);
      if (["Completed", "Rejected"].includes(finalStatus)) {
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

safeElement("gpsBtn")?.addEventListener("click", () => {
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      latitude = position.coords.latitude;
      longitude = position.coords.longitude;
      marker.setLatLng([latitude, longitude]);
      map.setView([latitude, longitude], 15);

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
        );
        const data = await response.json();
        safeElement("location").value = data.display_name;
      } catch {
        safeElement("location").value = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      }
    },
    () => alert("Location permission denied.")
  );
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
      timestamp: serverTimestamp()
    });

    localStorage.setItem("currentEmergency", docRef.id);
    sessionStorage.removeItem("arrivalShown");

    // Start the real-time listener immediately. No page refresh is required.
    subscribeToEmergencyStatus(docRef.id);

    alert("🚑 Emergency Request Sent Successfully");
    event.target.reset();
    safeElement("location").value = "";
    latitude = 17.3850;
    longitude = 78.4867;
    marker.setLatLng([latitude, longitude]);
    map.setView([latitude, longitude], 13);
  } catch (error) {
    console.error(error);
    alert("Submission Failed");
  }
});

subscribeToEmergencyStatus(localStorage.getItem("currentEmergency"));

window.addEventListener("storage", (event) => {
  if (event.key === "currentEmergency") {
    subscribeToEmergencyStatus(event.newValue);
  }
});
