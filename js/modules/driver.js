import { db } from "../firebase/firebase-config.js";

import {
    collection,
    query,
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import {
    getCurrentDriver
} from "./driver-session.js";

const CURRENT_DRIVER = getCurrentDriver();

console.log(
    "Current logged driver:",
    CURRENT_DRIVER
);

const container =
    document.getElementById(
        "driverEmergencyContainer"
    );

const alarm =
    document.getElementById(
        "driverAlarm"
    );

const currentPage =
    window.location.pathname
        .split("/")
        .pop()
        .toLowerCase();

const isRequestsPage =
    currentPage === "driver-requests.html";

const isDashboardPage =
    currentPage === "driver.html" ||
    currentPage === "";

let driverData = {};

// ==========================================
// SAFE HTML
// ==========================================

function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}

function safePhone(value) {

    return String(value ?? "")
        .replace(/[^0-9+() -]/g, "");

}

// ==========================================
// UNLOCK ALARM AUDIO
// ==========================================

if (alarm) {

    document.addEventListener(
        "click",

        () => {

            alarm
                .play()
                .then(() => {

                    alarm.pause();

                    alarm.currentTime = 0;

                })
                .catch(() => {});

        },

        {
            once: true
        }
    );

}

// ==========================================
// CLOCK
// ==========================================

function updateClock() {

    const clock =
        document.getElementById(
            "clock"
        );

    if (clock) {

        clock.textContent =
            new Date()
                .toLocaleTimeString();

    }

}

updateClock();

setInterval(
    updateClock,
    1000
);

// ==========================================
// STATUS BADGE
// ==========================================

function updateDriverStatusUI(status) {

    const badge =
        document.querySelector(
            ".available, .busy"
        );

    if (!badge) return;

    badge.textContent =
        status || "Available";

    if (
        status === "Busy" ||
        status === "Unavailable" ||
        status === "Leave"
    ) {

        badge.className = "busy";

    } else {

        badge.className =
            "available";

    }

}

// ==========================================
// LOAD CURRENT DRIVER
// ==========================================

async function loadDriver() {

    try {

        const driverReference =
            doc(
                db,
                "drivers",
                CURRENT_DRIVER
            );

        const snapshot =
            await getDoc(
                driverReference
            );

        if (!snapshot.exists()) {

            console.error(
                `Driver document not found: ${CURRENT_DRIVER}`
            );

            if (container) {

                container.innerHTML = `

                    <div class="theme-empty-message">

                        <h2>
                            Driver profile not found
                        </h2>

                        <p>
                            Firestore document:
                            ${escapeHTML(CURRENT_DRIVER)}
                        </p>

                    </div>

                `;

            }

            return;

        }

        driverData =
            snapshot.data();

        const driverStatus =
            driverData.status ||
            "Available";

        updateDriverStatusUI(
            driverStatus
        );

        const statusSelect =
            document.getElementById(
                "driverStatusSelect"
            );

        if (statusSelect) {

            statusSelect.value =
                driverStatus;

            statusSelect.onchange =
                async () => {

                    try {

                        await updateDoc(
                            doc(
                                db,
                                "drivers",
                                CURRENT_DRIVER
                            ),
                            {
                                status:
                                    statusSelect.value
                            }
                        );

                        driverData.status =
                            statusSelect.value;

                        updateDriverStatusUI(
                            statusSelect.value
                        );

                    } catch (error) {

                        console.error(
                            "Unable to update driver status:",
                            error
                        );

                        alert(
                            error.message
                        );

                    }

                };

        }

    } catch (error) {

        console.error(
            "Unable to load driver:",
            error
        );

    }

}

loadDriver();

// ==========================================
// PAGE-SPECIFIC STATUS RULES
// ==========================================

function shouldShowEmergency(data) {

    const belongsToCurrentDriver =
        data.driverAssigned === true &&
        data.assignedDriver ===
            CURRENT_DRIVER;

    if (!belongsToCurrentDriver) {

        return false;

    }

    const driverStatus =
        String(
            data.driverStatus || ""
        )
            .trim()
            .toLowerCase();

    const emergencyStatus =
        String(
            data.status || ""
        )
            .trim()
            .toLowerCase();

    const isCompleted =
        driverStatus === "completed" ||
        emergencyStatus === "completed";

    const isRejected =
        driverStatus === "rejected" ||
        emergencyStatus === "rejected";

    const isCancelled =
        driverStatus === "cancelled" ||
        driverStatus === "canceled" ||
        emergencyStatus === "cancelled" ||
        emergencyStatus === "canceled";

    if (
        isCompleted ||
        isRejected ||
        isCancelled
    ) {

        return false;

    }

    /*
        REQUESTS PAGE:
        Only requests waiting for
        Accept or Reject.
    */

    if (isRequestsPage) {

        return (
            driverStatus === "waiting" ||
            driverStatus === "pending" ||
            driverStatus === "assigned"
        );

    }

    /*
        DRIVER DASHBOARD:
        Only accepted/current active trip.
    */

  if (isDashboardPage) {

    return (
        driverStatus === "waiting" ||
        driverStatus === "pending" ||
        driverStatus === "assigned" ||
        driverStatus === "accepted" ||
        driverStatus === "en route" ||
        driverStatus === "enroute" ||
        driverStatus === "dispatched" ||
        driverStatus === "arrived"
    );

}

    return false;

}

// ==========================================
// EMPTY STATE
// ==========================================

function renderEmptyState() {

    if (!container) return;

    if (isRequestsPage) {

        container.innerHTML = `

            <div class="driver-empty-state">

                <div class="empty-icon">
                    🚑
                </div>

                <h2>
                    No New Emergency Requests
                </h2>

                <p>
                    New hospital assignments
                    waiting for your response
                    will appear here.
                </p>

                <p>
                    Logged in as
                    <strong>
                        ${escapeHTML(CURRENT_DRIVER)}
                    </strong>
                </p>

            </div>

        `;

        return;

    }

    container.innerHTML = `

        <div class="theme-empty-message">

            <h2>
                🚑 No Active Trip
            </h2>

            <p>
                Accept an emergency from the
                Emergency Requests page to
                begin a trip.
            </p>

            <p>
                Logged in as
                <strong>
                    ${escapeHTML(CURRENT_DRIVER)}
                </strong>
            </p>

        </div>

    `;

}

// ==========================================
// EMERGENCY CARD
// ==========================================

function createEmergencyCard(
    alertId,
    data
) {

    const driverStatus =
        data.driverStatus ||
        "Waiting";

    const isWaiting =
        ["Waiting", "Pending", "Assigned"]
            .includes(driverStatus);

    const isActive =
        [
            "Accepted",
            "En Route",
            "EnRoute",
            "Dispatched",
            "Arrived"
        ].includes(driverStatus);

    const heading =
    isWaiting
        ? "🚨 New Emergency Request"
        : "🚑 Active Emergency Trip";

    return `

        <div class="driver-card theme-emergency-card">

            <h2>
                ${heading}
            </h2>

            <p>
                <b>Patient:</b>
                ${escapeHTML(
                    data.patientName ||
                    "-"
                )}
            </p>

            <p>
                <b>Phone:</b>
                ${escapeHTML(
                    data.phone ||
                    "-"
                )}
            </p>

            <p>
                <b>Emergency:</b>
                ${escapeHTML(
                    data.emergencyType ||
                    "-"
                )}
            </p>

            <p>
                <b>Symptoms:</b>
                ${escapeHTML(
                    data.symptoms ||
                    "-"
                )}
            </p>

            <p>
                <b>Hospital:</b>
                ${escapeHTML(
                    data.hospital ||
                    "-"
                )}
            </p>

            <p>
                <b>Location:</b>
                ${escapeHTML(
                    data.location ||
                    "-"
                )}
            </p>

            <p>
                <b>Driver Status:</b>
                ${escapeHTML(
                    driverStatus
                )}
            </p>

            <div class="driver-actions">

                ${
                    (isRequestsPage || isDashboardPage) &&
                     isWaiting

                        ? `

                            <button
                                class="acceptBtn"
                                onclick="acceptEmergency(
                                    '${alertId}'
                                )"
                            >
                                ✅ Accept
                            </button>

                            <button
                                class="rejectBtn"
                                onclick="rejectEmergency(
                                    '${alertId}'
                                )"
                            >
                                ❌ Reject
                            </button>

                        `

                        : ""
                }

                ${
                    data.phone

                        ? `

                            <button
                                class="callBtn"
                                onclick="
                                    window.location.href =
                                    'tel:${safePhone(
                                        data.phone
                                    )}'
                                "
                            >
                                📞 Call
                            </button>

                        `

                        : ""
                }

                ${
                    isDashboardPage &&
                    isActive

                        ? `

                            <button
                                class="mapBtn"
                                onclick="
                                    window.location.href =
                                    'ambulance-map.html?id=${alertId}'
                                "
                            >
                                📍 Continue Navigation
                            </button>

                        `

                        : ""
                }

            </div>

        </div>

    `;

}

// ==========================================
// FIRESTORE EMERGENCY LISTENER
// ==========================================

const alertsQuery =
    query(
        collection(
            db,
            "alerts"
        ),
        orderBy(
            "timestamp",
            "desc"
        )
    );

let previousWaitingIds =
    new Set();

onSnapshot(

    alertsQuery,

    (snapshot) => {

        if (!container) {

            console.error(
                "driverEmergencyContainer was not found."
            );

            return;

        }

        const visibleEmergencies = [];

        const currentWaitingIds =
            new Set();

        snapshot.forEach(
            (alertDocument) => {

                const data =
                    alertDocument.data();

                if (
                    data.driverAssigned === true &&
                    data.assignedDriver ===
                        CURRENT_DRIVER &&
                    ["Waiting", "Pending", "Assigned"]
                        .includes(
                            data.driverStatus
                        )
                ) {

                    currentWaitingIds.add(
                        alertDocument.id
                    );

                }

                if (
                    shouldShowEmergency(
                        data
                    )
                ) {

                    visibleEmergencies.push({
                        id:
                            alertDocument.id,
                        data
                    });

                }

            }
        );

        /*
            Alarm only for genuinely
            new waiting requests.
        */

       const newRequests =
    [...currentWaitingIds].filter(
        id => !previousWaitingIds.has(id)
    );

if (newRequests.length > 0 && alarm) {

    alarm.pause();
    alarm.currentTime = 0;

    alarm.play().catch(() => {});
}

previousWaitingIds =
    new Set(currentWaitingIds);

        previousWaitingIds =
            currentWaitingIds;

        /*
            A driver should only have
            one active dashboard trip.
        */

        const recordsToRender =
            isDashboardPage
                ? visibleEmergencies.slice(
                    0,
                    1
                )
                : visibleEmergencies;

        if (
            recordsToRender.length === 0
        ) {

            renderEmptyState();

            return;

        }

        container.innerHTML =
            recordsToRender
                .map(
                    (record) =>
                        createEmergencyCard(
                            record.id,
                            record.data
                        )
                )
                .join("");

    },

    (error) => {

        console.error(
            "Emergency listener failed:",
            error
        );

        if (container) {

            container.innerHTML = `

                <div class="theme-empty-message">

                    <h2>
                        Unable to load emergencies
                    </h2>

                    <p>
                        ${escapeHTML(
                            error.message
                        )}
                    </p>

                </div>

            `;

        }

    }

);

// ==========================================
// ACCEPT EMERGENCY
// ==========================================

window.acceptEmergency =
    async (id) => {

        try {

            if (
                !driverData ||
                Object.keys(
                    driverData
                ).length === 0
            ) {

                alert(
                    "Driver profile is still loading. Please try again."
                );

                return;

            }

            const emergencyReference =
                doc(
                    db,
                    "alerts",
                    id
                );

            const emergencySnapshot =
                await getDoc(
                    emergencyReference
                );

            if (
                !emergencySnapshot.exists()
            ) {

                alert(
                    "Emergency request was not found."
                );

                return;

            }

            const emergency =
                emergencySnapshot.data();

            if (
                emergency.assignedDriver !==
                    CURRENT_DRIVER ||
                emergency.driverAssigned !==
                    true
            ) {

                alert(
                    "This emergency is no longer assigned to you."
                );

                return;

            }

            if (
                ![
                    "Waiting",
                    "Pending",
                    "Assigned"
                ].includes(
                    emergency.driverStatus
                )
            ) {

                alert(
                    "This emergency has already been handled."
                );

                return;

            }

            await updateDoc(
                emergencyReference,
                {
                    driverStatus:
                        "Accepted",

                    driverName:
                        driverData.driverName ||
                        driverData.name ||
                        CURRENT_DRIVER,

                    driverVehicle:
                        driverData.vehicle ||
                        driverData.ambulanceNo ||
                        "-",

                    driverResponseTime:
                        new Date(),

                    acceptedAt:
                        new Date(),

                    driverId:
                        CURRENT_DRIVER
                }
            );

            await updateDoc(
                doc(
                    db,
                    "drivers",
                    CURRENT_DRIVER
                ),
                {
                    status:
                        "Busy"
                }
            );

            driverData.status =
                "Busy";

            updateDriverStatusUI(
                "Busy"
            );

            if (alarm) {

                alarm.pause();

                alarm.currentTime = 0;

            }

            alert(
                "✅ Emergency Accepted"
            );

            /*
                After acceptance, move to
                the active dashboard.
            */

            window.location.href =
                "driver.html";

        } catch (error) {

            console.error(
                "Accept emergency error:",
                error
            );

            alert(
                error.message
            );

        }

    };

// ==========================================
// REJECT EMERGENCY
// ==========================================

window.rejectEmergency =
    async (id) => {

        const reason =
            prompt(
                "Reason for rejection?"
            );

        if (!reason) {

            return;

        }

        try {

            const emergencyReference =
                doc(
                    db,
                    "alerts",
                    id
                );

            const emergencySnapshot =
                await getDoc(
                    emergencyReference
                );

            if (
                !emergencySnapshot.exists()
            ) {

                alert(
                    "Emergency request was not found."
                );

                return;

            }

            const emergency =
                emergencySnapshot.data();

            if (
                emergency.assignedDriver !==
                CURRENT_DRIVER
            ) {

                alert(
                    "This emergency is no longer assigned to you."
                );

                return;

            }

            await updateDoc(
                emergencyReference,
                {
                    driverStatus:
                        "Rejected",

                    driverRejectReason:
                        reason,

                    rejectedByDriver:
                        CURRENT_DRIVER,

                    rejectedAt:
                        new Date(),

                    assignedDriver:
                        null,

                    driverAssigned:
                        false,

                    driverId:
                        null,

                    driverName:
                        null,

                    driverVehicle:
                        null
                }
            );

            await updateDoc(
                doc(
                    db,
                    "drivers",
                    CURRENT_DRIVER
                ),
                {
                    status:
                        "Available"
                }
            );

            driverData.status =
                "Available";

            updateDriverStatusUI(
                "Available"
            );

            if (alarm) {

                alarm.pause();

                alarm.currentTime = 0;

            }

            alert(
                "Emergency Rejected"
            );

        } catch (error) {

            console.error(
                "Reject emergency error:",
                error
            );

            alert(
                error.message
            );

        }

    };