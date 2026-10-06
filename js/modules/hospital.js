import { db } from "../firebase/firebase-config.js";
import {
    requireHospitalLogin,
    isAlertForHospital,
    logoutHospital
} from "./hospital-session.js";

import {
    collection,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    getDoc,
    runTransaction,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const currentHospital = requireHospitalLogin();

if (!currentHospital) {
    throw new Error("Hospital login required.");
}

const container = document.getElementById("emergencyContainer");
const counter = document.getElementById("activeCount");
const alarm = document.getElementById("alarmAudio");
const soundBtn = document.getElementById("soundBtn");
const hospitalName = document.getElementById("hospitalPanelName");
const logoutButton = document.getElementById("hospitalLogoutBtn");

if (hospitalName) {
    hospitalName.textContent = currentHospital.name;
}

if (logoutButton) {
    logoutButton.addEventListener("click", logoutHospital);
}

if (!alarm) {
    console.error("Hospital alarm not found.");
}

let alertedEmergencies = new Set();
let audioUnlocked = false;
let soundEnabled = true;
let firstLoad = true;

function unlockAudio() {
    if (audioUnlocked || !alarm) return;

    alarm.play()
        .then(() => {
            alarm.pause();
            alarm.currentTime = 0;
            audioUnlocked = true;
        })
        .catch(() => {});
}

document.addEventListener("click", unlockAudio, { once: true });
document.addEventListener("touchstart", unlockAudio, { once: true });

function updateClock() {
    const clock = document.getElementById("clock");
    if (clock) clock.textContent = new Date().toLocaleTimeString();
}

setInterval(updateClock, 1000);
updateClock();

document.getElementById("latestBtn")?.addEventListener("click", () => {
    window.location.href = "hospital.html";
});

document.getElementById("historyBtn")?.addEventListener("click", () => {
    window.location.href = "history.html";
});

soundBtn?.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    soundBtn.innerHTML = soundEnabled ? "🔊 Alarm ON" : "🔇 Alarm OFF";

    if (!soundEnabled && alarm) {
        alarm.pause();
    }
});

const alertsQuery = collection(db, "alerts");

function getEmergencyCoordinates(data) {
    const latitude = Number(
        data?.latitude ??
        data?.lat ??
        data?.coordinates?.latitude ??
        data?.coordinates?.lat
    );

    const longitude = Number(
        data?.longitude ??
        data?.lng ??
        data?.coordinates?.longitude ??
        data?.coordinates?.lng
    );

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
    }

    return {
        latitude,
        longitude
    };
}

function formatTimestamp(ts) {
    if (!ts) return "Processing...";
    try {
        const date = ts.toDate ? ts.toDate() : ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
        if (isNaN(date.getTime())) return "Processing...";
        return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    } catch (_) {
        return "Processing...";
    }
}

function getLocationMapUrl(data, alertId = "") {
    const coordinates = getEmergencyCoordinates(data);

    if (!coordinates || !alertId) {
        return "";
    }

    return `ambulance-map.html?id=${encodeURIComponent(alertId)}&preview=1`;
}

function showAlarmAttention(message) {
    let banner = document.getElementById("hospitalAlarmBanner");

    if (!banner) {
        banner = document.createElement("button");
        banner.id = "hospitalAlarmBanner";
        banner.type = "button";
        banner.style.cssText = `
            position:fixed;top:82px;right:20px;z-index:10050;
            border:0;border-radius:14px;padding:12px 16px;
            background:#dc2626;color:#fff;font-weight:800;
            box-shadow:0 16px 40px rgba(220,38,38,.3);cursor:pointer;
        `;
        banner.addEventListener("click", async () => {
            unlockAudio();
            try {
                alarm.currentTime = 0;
                await alarm.play();
                banner.remove();
            } catch (_) {}
        });
        document.body.appendChild(banner);
    }

    banner.textContent = `🔔 ${message} — Tap to enable sound`;
}

async function playHospitalAlarm(message = "New emergency received") {
    if (!soundEnabled || !alarm) return;

    try {
        alarm.pause();
        alarm.currentTime = 0;
        await alarm.play();
        audioUnlocked = true;
    } catch (error) {
        console.warn("Hospital alarm autoplay was blocked:", error);
        showAlarmAttention(message);
    }
}

function getAlertTime(data) {
    const ts = data?.timestamp || data?.createdAt;
    if (!ts) return 0;
    if (typeof ts.toMillis === "function") return ts.toMillis();
    if (typeof ts.seconds === "number") return ts.seconds * 1000;
    const d = new Date(ts).getTime();
    return isNaN(d) ? 0 : d;
}

onSnapshot(alertsQuery, (snapshot) => {
    const hospitalDocuments = snapshot.docs
        .filter((documentSnapshot) =>
            isAlertForHospital(documentSnapshot.data(), currentHospital)
        )
        .sort((a, b) => getAlertTime(b.data()) - getAlertTime(a.data()));

    snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        const id = change.doc.id;

        if (!isAlertForHospital(data, currentHospital)) return;

        const receivedAt = data.timestamp?.toMillis?.() || 0;
        const recentPendingOnInitialLoad =
            firstLoad &&
            change.type === "added" &&
            data.status === "Pending" &&
            receivedAt > 0 &&
            Date.now() - receivedAt < 90000;

        const newPendingEmergency =
            !firstLoad &&
            change.type === "added" &&
            data.status === "Pending";

        const importantDriverResponse =
            !firstLoad &&
            change.type === "modified" &&
            ["Accepted", "Rejected"].includes(data.driverStatus);

        if (
            (recentPendingOnInitialLoad || newPendingEmergency || importantDriverResponse) &&
            !alertedEmergencies.has(`${id}:${data.status}:${data.driverStatus}`)
        ) {
            alertedEmergencies.add(`${id}:${data.status}:${data.driverStatus}`);
            playHospitalAlarm(
                data.isSOS
                    ? "Critical SOS received"
                    : importantDriverResponse
                        ? `Driver ${data.driverStatus}`
                        : "New emergency received"
            );
        }
    });

    firstLoad = false;
    container.innerHTML = "";

    let active = 0;

    hospitalDocuments.forEach((docSnap) => {
        const data = docSnap.data();

        if (data.status !== "Completed" && data.status !== "Rejected") {
            active++;
        }

        container.innerHTML += `
            <div class="emergency-card ${data.isSOS ? "sos-priority-card" : ""}">
                ${data.isSOS ? `<div class="sos-emergency-badge">🆘 Critical Smart SOS</div>` : ""}
                <h3>🚨 ${data.emergencyType || "Emergency"}</h3>
                <p><b>Patient :</b> ${data.patientName || "-"}</p>
                <p><b>Phone :</b> ${data.phone || "-"}</p>
                <p><b>Symptoms :</b> ${data.symptoms || "-"}</p>
                <p><b>Location :</b> ${data.location || data.address || "Location coordinates available"}</p>
                ${
                    getLocationMapUrl(data, docSnap.id)
                        ? `<p>
                            <a
                                href="${getLocationMapUrl(data, docSnap.id)}"
                                
                                class="hospital-location-link"
                            >
                                📍 Open In-App Patient Map
                            </a>
                           </p>`
                        : `<p style="color:#dc2626;font-weight:700;">⚠️ Patient coordinates are unavailable.</p>`
                }
                ${data.isSOS ? `<p><b>AI Priority :</b> <span style="color:#dc2626;font-weight:800">CRITICAL — IMMEDIATE RESPONSE</span></p>` : ""}
                ${data.nearestHospitalDistanceKm != null ? `<p><b>Distance :</b> ${data.nearestHospitalDistanceKm} km from hospital</p>` : ""}
                <p><b>Hospital :</b> ${data.hospital || currentHospital.name}</p>
                <p><b>📅 Received :</b><br>
                    ${formatTimestamp(data.timestamp)}
                </p>
                <p><b>Status :</b> <span style="color:red">${data.status || "Pending"}</span></p>

                ${data.driverStatus ? `
                    <div class="driverInfo">
                        <h4>🚑 Driver Response</h4>
                        <p><b>Status :</b> ${data.driverStatus}</p>
                        <p><b>Driver :</b> ${data.driverName || data.assignedDriver || "Not Assigned"}</p>
                        <p><b>Vehicle :</b> ${data.driverVehicle || "-"}</p>
                        ${data.driverRejectReason ? `
                            <p style="color:red;"><b>Reason :</b> ${data.driverRejectReason}</p>
                        ` : ""}
                    </div>
                ` : ""}

                <div class="actions">
                    <button class="accept" onclick="acceptCase('${docSnap.id}')">Accept</button>
                    <button class="reject" onclick="rejectCase('${docSnap.id}')">Reject</button>
                    <button class="assign" onclick="assignDriver('${docSnap.id}')">🚑 Assign Driver</button>
                    <button class="dispatch" onclick="dispatchCase('${docSnap.id}')">Dispatch</button>
                    <button class="complete" onclick="completeCase('${docSnap.id}')">Completed</button>
                    <button class="delete" onclick="deleteCase('${docSnap.id}')">🗑 Remove</button>
                    <button class="timeline" onclick="window.location.href='patient-timeline.html?id=${docSnap.id}'">📋 Timeline</button>
                </div>
            </div>
        `;
    });

    if (hospitalDocuments.length === 0) {
        container.innerHTML = `
            <div class="hospital-empty-state">
                <h3>✅ No emergencies for ${currentHospital.name}</h3>
                <p>New requests sent to this hospital will appear here automatically.</p>
            </div>
        `;
    }

    counter.textContent = active;
});

async function getAuthorizedAlert(id) {
    const alertRef = doc(db, "alerts", id);
    const snap = await getDoc(alertRef);

    if (!snap.exists()) {
        alert("Emergency not found.");
        return null;
    }

    if (!isAlertForHospital(snap.data(), currentHospital)) {
        alert("You cannot manage another hospital's emergency.");
        return null;
    }

    return { ref: alertRef, data: snap.data() };
}


/**
 * Releases a driver only when that driver is still reserved for this emergency.
 * This prevents one hospital from accidentally freeing a driver already reused
 * by another emergency.
 */
async function releaseAssignedDriver(alertId, alertData) {
    const driverId = String(
        alertData?.assignedDriver || alertData?.driverId || ""
    ).trim();

    if (!driverId) return;

    const driverRef = doc(db, "drivers", driverId);

    await runTransaction(db, async (transaction) => {
        const driverSnap = await transaction.get(driverRef);
        if (!driverSnap.exists()) return;

        const driver = driverSnap.data();
        const reservedEmergency = String(driver.assignedEmergency || "").trim();

        // Older records may not have assignedEmergency. Release those only when
        // the alert still points to this driver.
        if (reservedEmergency && reservedEmergency !== alertId) return;

        transaction.update(driverRef, {
            status: "Available",
            assignedEmergency: null,
            assignedHospital: null,
            reservedAt: null
        });
    });
}

window.acceptCase = async (id) => {
    try {
        const alertCase = await getAuthorizedAlert(id);
        if (!alertCase) return;

        await updateDoc(alertCase.ref, {
            status: "Accepted",
            hospitalStatus: "Accepted",
            acceptedAt: new Date()
        });

        alarm?.pause();
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
};

window.dispatchCase = async (id) => {
    try {
        const alertCase = await getAuthorizedAlert(id);
        if (!alertCase) return;

        const normDriverStatus = String(alertCase.data.driverStatus || "").trim().toLowerCase().replace(/[\s\-_]/g, "");
        const validDispatch = ["accepted", "driveraccepted", "enroute", "dispatched"].includes(normDriverStatus);

        if (!validDispatch) {
            alert("Driver has not accepted the request yet.");
            return;
        }

        await updateDoc(alertCase.ref, {
            status: "Dispatched",
            driverStatus: "Dispatched",
            dispatchedAt: new Date()
        });

        alert("✅ Ambulance dispatched successfully.");
        alarm?.pause();
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
};

window.completeCase = async (id) => {
    try {
        const alertCase = await getAuthorizedAlert(id);
        if (!alertCase) return;

        await updateDoc(alertCase.ref, {
            status: "Completed",
            driverStatus: "Completed",
            completedAt: new Date()
        });

        await releaseAssignedDriver(id, alertCase.data);

        alert("✅ Emergency completed. Driver is available again.");
        alarm?.pause();
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
};

window.rejectCase = async (id) => {
    const reason = prompt("Reason for rejection");
    if (!reason) return;

    try {
        const alertCase = await getAuthorizedAlert(id);
        if (!alertCase) return;

        await updateDoc(alertCase.ref, {
            status: "Rejected",
            hospitalStatus: "Rejected",
            rejectionReason: reason,
            rejectedAt: new Date(),
            driverAssigned: false,
            assignedDriver: null
        });

        await releaseAssignedDriver(id, alertCase.data);

        alarm?.pause();
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
};

window.deleteCase = async (id) => {
    const confirmed = confirm("Are you sure you want to delete this emergency permanently?");
    if (!confirmed) return;

    try {
        const alertCase = await getAuthorizedAlert(id);
        if (!alertCase) return;

        await releaseAssignedDriver(id, alertCase.data);
        await deleteDoc(alertCase.ref);
        alert("✅ Emergency deleted successfully.");
    } catch (error) {
        console.error(error);
        alert("❌ " + error.message);
    }
};

window.assignDriver = async (id) => {
    const driverId = prompt("Enter Driver ID\n\nExample: driver1");
    if (!driverId) return;

    const rawId = driverId.trim().toLowerCase().replace(/[\s\-_]/g, "");
    const cleanDriverId = rawId === "driver1" || rawId === "1" ? "driver1" :
                          rawId === "driver2" || rawId === "2" ? "driver2" :
                          rawId === "driver3" || rawId === "3" ? "driver3" :
                          driverId.trim();

    if (!cleanDriverId) {
        alert("❌ Please enter a valid Driver ID.");
        return;
    }

    try {
        const alertCase = await getAuthorizedAlert(id);
        if (!alertCase) return;

        const driverRef = doc(db, "drivers", cleanDriverId);

        await runTransaction(db, async (transaction) => {
            const [driverSnap, alertSnap] = await Promise.all([
                transaction.get(driverRef),
                transaction.get(alertCase.ref)
            ]);

            if (!driverSnap.exists()) {
                throw new Error("DRIVER_NOT_FOUND");
            }

            if (!alertSnap.exists()) {
                throw new Error("EMERGENCY_NOT_FOUND");
            }

            const latestAlert = alertSnap.data();

            if (!isAlertForHospital(latestAlert, currentHospital)) {
                throw new Error("UNAUTHORIZED_EMERGENCY");
            }

            if (
                latestAlert.driverAssigned === true &&
                latestAlert.assignedDriver
            ) {
                throw new Error("EMERGENCY_ALREADY_ASSIGNED");
            }

            const driver = driverSnap.data();
            const driverStatus = String(driver.status || "Unavailable").trim();

            if (driverStatus.toLowerCase() !== "available") {
                throw new Error(`DRIVER_UNAVAILABLE:${driverStatus}`);
            }

            // Drivers are a shared city-wide ambulance pool. Any logged-in
            // hospital may reserve any available driver, regardless of the
            // optional hospital field stored in the driver profile.
            transaction.update(driverRef, {
                status: "Busy",
                assignedEmergency: id,
                assignedHospital: currentHospital.name,
                reservedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            transaction.update(alertCase.ref, {
                driverId: cleanDriverId,
                assignedDriver: cleanDriverId,
                assignedDriverId: cleanDriverId,
                driverAssigned: true,
                driverStatus: "Assigned",
                status: "Driver Assigned",
                assignedAt: serverTimestamp(),
                driverAssignedTime: serverTimestamp(),
                assignedHospital: currentHospital.name,
                assignmentVersion: Number(latestAlert.assignmentVersion || 0) + 1,
                updatedAt: serverTimestamp()
            });
        });

        // Notification storage is helpful but must never cancel a successful
        // driver assignment if the notifications collection has stricter rules.
        try {
            await addDoc(collection(db, "notifications"), {
                type: "DRIVER_ASSIGNMENT",
                title: "New emergency assignment",
                message: `${cleanDriverId} was assigned an emergency by ${currentHospital.name}.`,
                recipientRole: "DRIVER",
                recipientId: cleanDriverId,
                alertId: id,
                hospital: currentHospital.name,
                read: false,
                createdAt: serverTimestamp()
            });
        } catch (notificationError) {
            console.warn("Assignment saved; notification log was skipped:", notificationError);
        }

        alert(`✅ ${cleanDriverId} assigned successfully. The driver page will update automatically.`);
    } catch (error) {
        console.error(error);

        if (error.message === "DRIVER_NOT_FOUND") {
            alert("❌ Driver not found.");
            return;
        }

        if (error.message === "EMERGENCY_NOT_FOUND") {
            alert("❌ Emergency not found.");
            return;
        }

        if (error.message === "UNAUTHORIZED_EMERGENCY") {
            alert("❌ You cannot manage another hospital's emergency.");
            return;
        }

        if (error.message === "EMERGENCY_ALREADY_ASSIGNED") {
            alert("❌ A driver is already assigned to this emergency.");
            return;
        }

        if (error.message.startsWith("DRIVER_UNAVAILABLE:")) {
            const status = error.message.split(":").slice(1).join(":") || "Unavailable";
            alert(`❌ Driver is currently ${status}. Please select another available driver.`);
            return;
        }

        alert("❌ " + error.message);
    }
};

