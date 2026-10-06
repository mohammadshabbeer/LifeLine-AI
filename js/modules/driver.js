import { db } from "../firebase/firebase-config.js";

import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    serverTimestamp,
    updateDoc,
    addDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import {
    getCurrentDriver
} from "./driver-session.js";

const container = document.getElementById("driverEmergencyContainer");
const alarm = document.getElementById("driverAlarm");
const statusSelect = document.getElementById("driverStatusSelect");
const currentPage = (window.location.pathname.split("/").pop() || "driver.html").toLowerCase();
const isRequestsPage = currentPage === "driver-requests.html";
const isDashboardPage = currentPage === "driver.html" || currentPage === "";

let driverData = {};
let stopDriverListener = null;
let stopAlertsListener = null;
let firstAlertSnapshot = true;

function normalize(value) {
    return String(value || "").trim().toLowerCase().replace(/[\s\-_]/g, "");
}

function activeDriverId() {
    return String(getCurrentDriver() || "").trim();
}

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function safePhone(value) {
    return String(value ?? "").replace(/[^0-9+() -]/g, "");
}

function formatTimestamp(value) {
    try {
        const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
        return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
    } catch (_) {
        return "-";
    }
}

function getAssignedDriver(data) {
    return String(
        data?.driverId ||
        data?.assignedDriverId ||
        data?.assignedDriver ||
        ""
    ).trim();
}

function belongsToCurrentDriver(data) {
    const assigned = normalize(getAssignedDriver(data));
    const current = normalize(activeDriverId());
    return assigned !== "" && current !== "" && assigned === current;
}

function updateClock() {
    const clock = document.getElementById("clock");
    if (clock) clock.textContent = new Date().toLocaleTimeString();
}

updateClock();
window.setInterval(updateClock, 1000);

function updateDriverStatusUI(status) {
    const value = status || "Available";
    const badge = document.getElementById("driverStatusBadge") ||
        document.querySelector(".driverStatus .available, .driverStatus .busy");

    if (badge) {
        badge.textContent = value;
        badge.className = normalize(value) === "available" ? "available" : "busy";
    }

    if (statusSelect && statusSelect.value !== value) {
        statusSelect.value = value;
    }
}

function showMessage(title, message) {
    if (!container) return;
    container.innerHTML = `
        <div class="theme-empty-message">
            <h2>${escapeHTML(title)}</h2>
            <p>${escapeHTML(message)}</p>
        </div>
    `;
}

function renderEmptyState() {
    if (isRequestsPage) {
        showMessage(
            "🚑 No New Emergency Requests",
            `New assignments for ${activeDriverId() || "this driver"} will appear automatically.`
        );
        return;
    }

    showMessage(
        "🚑 No Active Trip",
        "Accept an emergency from Emergency Requests to begin navigation."
    );
}

function ensureAlarmButton() {
    let button = document.getElementById("enableDriverAlarm");
    if (button) return button;

    button = document.createElement("button");
    button.id = "enableDriverAlarm";
    button.type = "button";
    button.textContent = "🔊 Enable Emergency Alarm";
    button.style.cssText = `
        position:fixed;right:20px;bottom:20px;z-index:10050;
        border:0;border-radius:12px;padding:12px 16px;
        background:#dc2626;color:#fff;font-weight:800;cursor:pointer;
        box-shadow:0 14px 34px rgba(220,38,38,.28);
    `;

    button.addEventListener("click", async () => {
        if (!alarm) return;
        try {
            alarm.currentTime = 0;
            await alarm.play();
            window.setTimeout(() => {
                alarm.pause();
                alarm.currentTime = 0;
            }, 400);
            button.textContent = "✅ Alarm Enabled";
            button.style.background = "#16a34a";
        } catch (error) {
            console.error("Unable to enable driver alarm:", error);
        }
    });

    document.body.appendChild(button);
    return button;
}

async function playDriverAlarm() {
    if (!alarm) return;
    try {
        alarm.pause();
        alarm.currentTime = 0;
        await alarm.play();
    } catch (error) {
        console.warn("Driver alarm autoplay blocked:", error);
        const button = ensureAlarmButton();
        button.textContent = "🚨 New Assignment — Tap for Alarm";
        button.style.background = "#dc2626";
    }
}

ensureAlarmButton();

function waitingStatus(data) {
    const st = normalize(data?.driverStatus || data?.status);
    return ["waiting", "pending", "assigned", "driverassigned"].includes(st);
}

function completedStatus(data) {
    const st = normalize(data?.driverStatus || data?.status);
    return ["completed", "rejected", "cancelled", "canceled", "driverrejected"].includes(st);
}

function activeTripStatus(data) {
    const st = normalize(data?.driverStatus || data?.status);
    return ["accepted", "driveraccepted", "dispatched", "enroute", "arrived"].includes(st);
}

function createEmergencyCard(alertId, data) {
    const driverStatus = data.driverStatus || "Assigned";
    const waiting = waitingStatus(data);
    const active = activeTripStatus(data);
    const coordinatesAvailable = Number.isFinite(Number(data.latitude ?? data.lat)) &&
        Number.isFinite(Number(data.longitude ?? data.lng));

    return `
        <article class="driver-card theme-emergency-card" data-alert-id="${escapeHTML(alertId)}">
            <h2>${waiting ? "🚨 New Emergency Request" : "🚑 Active Emergency Trip"}</h2>
            <p><b>Patient:</b> ${escapeHTML(data.patientName || "Unknown Patient")}</p>
            <p><b>Phone:</b> ${escapeHTML(data.phone || "-")}</p>
            <p><b>Emergency:</b> ${escapeHTML(data.emergencyType || "Emergency")}</p>
            <p><b>Symptoms:</b> ${escapeHTML(data.symptoms || "-")}</p>
            <p><b>Hospital:</b> ${escapeHTML(data.hospital || data.assignedHospital || "-")}</p>
            <p><b>Location:</b> ${escapeHTML(data.location || data.address || (coordinatesAvailable ? "GPS coordinates available" : "-"))}</p>
            <p><b>Assigned:</b> ${escapeHTML(formatTimestamp(data.assignedAt || data.driverAssignedTime || data.timestamp))}</p>
            <p><b>Driver Status:</b> ${escapeHTML(driverStatus)}</p>

            <div class="driver-actions">
                ${waiting ? `
                    <button class="acceptBtn" onclick="acceptEmergency('${alertId}')">✅ Accept</button>
                    <button class="rejectBtn" onclick="rejectEmergency('${alertId}')">❌ Reject</button>
                ` : ""}

                ${data.phone ? `
                    <button class="callBtn" onclick="window.location.href='tel:${safePhone(data.phone)}'">📞 Call</button>
                ` : ""}

                ${active ? `
                    <button class="mapBtn" onclick="window.location.href='ambulance-map.html?id=${encodeURIComponent(alertId)}'">📍 Continue Navigation</button>
                ` : ""}

                ${normalize(driverStatus) === "accepted" ? `
                    <button class="dispatch" onclick="updateTripStatus('${alertId}','En Route')">🚑 Start Trip</button>
                ` : ""}

                ${["dispatched", "en route", "enroute"].includes(normalize(driverStatus)) ? `
                    <button class="arrived" onclick="updateTripStatus('${alertId}','Arrived')">📍 Mark Arrived</button>
                ` : ""}

                ${normalize(driverStatus) === "arrived" ? `
                    <button class="complete" onclick="completeDriverTrip('${alertId}')">✅ Complete Trip</button>
                ` : ""}
            </div>
        </article>
    `;
}

function renderAlerts(records) {
    if (!container) return;
    if (!records.length) {
        renderEmptyState();
        return;
    }

    const displayRecords = isDashboardPage ? records.slice(0, 1) : records;
    container.innerHTML = displayRecords
        .map(({ id, data }) => createEmergencyCard(id, data))
        .join("");
}

async function loadDriverProfile() {
    const driverId = activeDriverId();
    if (!driverId) {
        showMessage("Driver account not configured", "No driverId is connected to this signed-in account.");
        return;
    }

    const driverRef = doc(db, "drivers", driverId);

    stopDriverListener?.();
    stopDriverListener = onSnapshot(
        driverRef,
        (snapshot) => {
            if (!snapshot.exists()) {
                showMessage("Driver profile not found", `Create Firestore document drivers/${driverId}.`);
                return;
            }

            driverData = { id: snapshot.id, ...snapshot.data() };
            updateDriverStatusUI(driverData.status || "Available");
        },
        (error) => {
            console.error("Unable to load driver profile:", error);
            showMessage("Unable to load driver profile", error.message);
        }
    );

    if (statusSelect) {
        statusSelect.addEventListener("change", async () => {
            const previousStatus = driverData.status || "Available";
            const selectedStatus = statusSelect.value;
            statusSelect.disabled = true;

            try {
                await updateDoc(driverRef, {
                    status: selectedStatus,
                    updatedAt: serverTimestamp()
                });
                driverData.status = selectedStatus;
                updateDriverStatusUI(selectedStatus);
                console.log(`Driver ${driverId} status changed to ${selectedStatus}`);
            } catch (error) {
                console.error("Unable to update driver status:", error);
                statusSelect.value = previousStatus;
                updateDriverStatusUI(previousStatus);
                alert(`Unable to update ${driverId}: ${error.message}`);
            } finally {
                statusSelect.disabled = false;
            }
        });
    }
}

function startEmergencyListener() {
    const driverId = activeDriverId();
    if (!driverId) return;

    const notifiedKey = `lifeline-driver-notified-${driverId}`;
    let notifiedIds = new Set(JSON.parse(sessionStorage.getItem(notifiedKey) || "[]"));

    stopAlertsListener?.();
    stopAlertsListener = onSnapshot(
        collection(db, "alerts"),
        (snapshot) => {
            const assigned = [];
            const waitingIds = [];

            snapshot.forEach((alertDocument) => {
                const data = alertDocument.data();
                if (!belongsToCurrentDriver(data) || completedStatus(data)) return;

                const record = { id: alertDocument.id, data };

                if (waitingStatus(data) || activeTripStatus(data)) {
                    assigned.push(record);
                }

                if (waitingStatus(data)) waitingIds.push(alertDocument.id);
            });

            assigned.sort((a, b) => {
                const aTime = a.data.assignedAt?.toMillis?.() || a.data.driverAssignedTime?.toMillis?.() || a.data.timestamp?.toMillis?.() || 0;
                const bTime = b.data.assignedAt?.toMillis?.() || b.data.driverAssignedTime?.toMillis?.() || b.data.timestamp?.toMillis?.() || 0;
                return bTime - aTime;
            });

            const newIds = waitingIds.filter((id) => !notifiedIds.has(id));
            if (newIds.length > 0) {
                playDriverAlarm();
                newIds.forEach((id) => notifiedIds.add(id));
                sessionStorage.setItem(notifiedKey, JSON.stringify([...notifiedIds]));
            }

            // Existing waiting assignments on the first load are included in
            // newIds because this browser session has not acknowledged them yet.
            firstAlertSnapshot = false;

            renderAlerts(assigned);
        },
        (error) => {
            console.error("Emergency listener failed:", error);
            showMessage("Unable to load emergencies", error.message);
        }
    );
}

async function getAssignedEmergency(alertId) {
    const reference = doc(db, "alerts", alertId);
    const snapshot = await getDoc(reference);
    if (!snapshot.exists()) throw new Error("Emergency request not found.");

    const data = snapshot.data();
    if (!belongsToCurrentDriver(data)) {
        throw new Error("This emergency is not assigned to the current driver.");
    }

    return { reference, data };
}

window.acceptEmergency = async (alertId) => {
    try {
        const { reference, data } = await getAssignedEmergency(alertId);
        if (!waitingStatus(data)) throw new Error("This emergency has already been handled.");

        await updateDoc(reference, {
            driverId: activeDriverId(),
            assignedDriverId: activeDriverId(),
            assignedDriver: activeDriverId(),
            driverAssigned: true,
            driverStatus: "Accepted",
            status: "Driver Accepted",
            driverName: driverData.driverName || driverData.name || activeDriverId(),
            driverVehicle: driverData.vehicle || driverData.ambulanceNo || "-",
            driverResponseTime: serverTimestamp(),
            acceptedAt: serverTimestamp()
        });

        await updateDoc(doc(db, "drivers", activeDriverId()), {
            status: "Busy",
            assignedEmergency: alertId,
            assignedHospital: data.hospital || data.assignedHospital || null,
            updatedAt: serverTimestamp()
        });

        try {
            await addDoc(collection(db, "notifications"), {
                type: "DRIVER_ACCEPTED",
                title: "Driver Accepted Request",
                message: `Driver ${driverData.driverName || driverData.name || activeDriverId()} accepted emergency request for ${data.patientName || "Patient"}.`,
                recipientRole: "HOSPITAL",
                recipientId: data.hospital || "Hospital",
                alertId: alertId,
                hospital: data.hospital || "",
                driverId: activeDriverId(),
                read: false,
                createdAt: serverTimestamp()
            });
        } catch (notificationError) {
            console.warn("Driver accept notification skipped:", notificationError);
        }

        alarm?.pause();
        if (alarm) alarm.currentTime = 0;
        window.location.href = "driver.html";
    } catch (error) {
        console.error("Accept emergency failed:", error);
        alert(error.message);
    }
};

window.rejectEmergency = async (alertId) => {
    const reason = prompt("Reason for rejection?");
    if (!reason) return;

    try {
        const { reference } = await getAssignedEmergency(alertId);

        await updateDoc(reference, {
            driverStatus: "Rejected",
            status: "Driver Rejected",
            driverRejectReason: reason,
            rejectedByDriver: activeDriverId(),
            rejectedAt: serverTimestamp(),
            driverAssigned: false,
            driverId: null,
            assignedDriverId: null,
            assignedDriver: null,
            driverName: null,
            driverVehicle: null
        });

        await updateDoc(doc(db, "drivers", activeDriverId()), {
            status: "Available",
            assignedEmergency: null,
            assignedHospital: null,
            reservedAt: null,
            updatedAt: serverTimestamp()
        });

        alarm?.pause();
        if (alarm) alarm.currentTime = 0;
    } catch (error) {
        console.error("Reject emergency failed:", error);
        alert(error.message);
    }
};

window.updateTripStatus = async (alertId, nextStatus) => {
    try {
        const { reference } = await getAssignedEmergency(alertId);
        const payload = {
            driverStatus: nextStatus,
            status: nextStatus,
            updatedAt: serverTimestamp()
        };

        if (nextStatus === "En Route") payload.dispatchedAt = serverTimestamp();
        if (nextStatus === "Arrived") payload.arrivedAt = serverTimestamp();

        await updateDoc(reference, payload);
        await updateDoc(doc(db, "drivers", activeDriverId()), {
            status: "Busy",
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Trip status update failed:", error);
        alert(error.message);
    }
};

window.completeDriverTrip = async (alertId) => {
    try {
        const { reference } = await getAssignedEmergency(alertId);

        await updateDoc(reference, {
            driverStatus: "Completed",
            status: "Completed",
            completedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        await updateDoc(doc(db, "drivers", activeDriverId()), {
            status: "Available",
            assignedEmergency: null,
            assignedHospital: null,
            reservedAt: null,
            updatedAt: serverTimestamp()
        });

        alert("✅ Trip completed. Driver is available again.");
    } catch (error) {
        console.error("Complete trip failed:", error);
        alert(error.message);
    }
};

console.log("Current logged driver:", activeDriverId());
loadDriverProfile();
startEmergencyListener();

window.addEventListener("beforeunload", () => {
    stopDriverListener?.();
    stopAlertsListener?.();
});
