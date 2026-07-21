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
    runTransaction
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

const alertsQuery = query(
    collection(db, "alerts"),
    orderBy("timestamp", "desc")
);

onSnapshot(alertsQuery, (snapshot) => {
    const hospitalDocuments = snapshot.docs.filter((documentSnapshot) =>
        isAlertForHospital(documentSnapshot.data(), currentHospital)
    );

    if (!firstLoad) {
        snapshot.docChanges().forEach((change) => {
            const data = change.doc.data();
            const id = change.doc.id;

            if (!isAlertForHospital(data, currentHospital)) return;

            if (
                (
                    data.status === "Pending" ||
                    data.driverStatus === "Accepted" ||
                    data.driverStatus === "Rejected"
                ) &&
                soundEnabled &&
                !alertedEmergencies.has(id) &&
                alarm
            ) {
                alertedEmergencies.add(id);
                alarm.currentTime = 0;
                alarm.play().catch(() => {});
            }
        });
    }

    firstLoad = false;
    container.innerHTML = "";

    let active = 0;

    hospitalDocuments.forEach((docSnap) => {
        const data = docSnap.data();

        if (data.status !== "Completed" && data.status !== "Rejected") {
            active++;
        }

        container.innerHTML += `
            <div class="emergency-card">
                <h3>🚨 ${data.emergencyType || "Emergency"}</h3>
                <p><b>Patient :</b> ${data.patientName || "-"}</p>
                <p><b>Phone :</b> ${data.phone || "-"}</p>
                <p><b>Symptoms :</b> ${data.symptoms || "-"}</p>
                <p><b>Hospital :</b> ${data.hospital || currentHospital.name}</p>
                <p><b>📅 Received :</b><br>
                    ${data.timestamp
                        ? data.timestamp.toDate().toLocaleDateString() + " " +
                          data.timestamp.toDate().toLocaleTimeString()
                        : "Processing..."}
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

        if (alertCase.data.driverStatus !== "Accepted") {
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

    const cleanDriverId = driverId.trim();

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
                reservedAt: new Date()
            });

            transaction.update(alertCase.ref, {
                assignedDriver: cleanDriverId,
                driverAssigned: true,
                driverStatus: "Waiting",
                driverAssignedTime: new Date(),
                assignedHospital: currentHospital.name
            });
        });

        alert(`✅ ${cleanDriverId} assigned successfully from the shared driver pool.`);
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

