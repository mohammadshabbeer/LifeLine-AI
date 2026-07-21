import { db } from "../firebase/firebase-config.js";

import {
    doc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import {
    getCurrentDriver,
    setCurrentDriver
} from "./driver-session.js";

const DRIVER_IDS = [
    "driver1",
    "driver2",
    "driver3"
];

const currentDriver = getCurrentDriver();

function formatDriverName(driverId) {
    return driverId.replace("driver", "Driver ");
}

function normalizeStatus(status) {
    return String(status || "Available")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-");
}

function createDriverSwitcher() {
    const switcherContainer =
        document.getElementById("driverSwitcher");

    if (!switcherContainer) {
        return;
    }

    switcherContainer.innerHTML = `
        <section class="shared-driver-switcher">

            <div class="shared-driver-switcher-header">

                <div>
                    <h2>🚑 Driver Demo Switch</h2>

                    <p>
                        Active Driver:
                        <strong id="sharedCurrentDriver">
                            ${formatDriverName(currentDriver)}
                        </strong>
                    </p>
                </div>

                <span
                    id="sharedCurrentDriverStatus"
                    class="shared-current-status"
                >
                    Checking...
                </span>

            </div>

            <div class="shared-driver-buttons">

                ${DRIVER_IDS.map((driverId) => `
                    <button
                        type="button"
                        class="shared-driver-button
                        ${driverId === currentDriver ? "active" : ""}"
                        data-driver-id="${driverId}"
                    >
                        ${formatDriverName(driverId)}

                        <span
                            id="${driverId}SwitcherStatus"
                            class="shared-driver-button-status"
                        >
                            Loading...
                        </span>
                    </button>
                `).join("")}

            </div>

        </section>
    `;

    const buttons =
        switcherContainer.querySelectorAll(
            ".shared-driver-button"
        );

    buttons.forEach((button) => {
        button.addEventListener("click", () => {
            const selectedDriver =
                button.dataset.driverId;

            if (!selectedDriver) {
                return;
            }

            if (selectedDriver === currentDriver) {
                return;
            }

            setCurrentDriver(selectedDriver);

            window.location.reload();
        });
    });
}

function listenToDriverStatuses() {
    DRIVER_IDS.forEach((driverId) => {
        const driverReference =
            doc(db, "drivers", driverId);

        onSnapshot(
            driverReference,
            (snapshot) => {
                const statusElement =
                    document.getElementById(
                        `${driverId}SwitcherStatus`
                    );

                const currentStatusElement =
                    document.getElementById(
                        "sharedCurrentDriverStatus"
                    );

                if (!snapshot.exists()) {
                    if (statusElement) {
                        statusElement.textContent =
                            "Not Found";

                        statusElement.className =
                            "shared-driver-button-status status-not-found";
                    }

                    return;
                }

                const driverData = snapshot.data();

                const status =
                    driverData.status || "Available";

                const statusClass =
                    normalizeStatus(status);

                if (statusElement) {
                    statusElement.textContent = status;

                    statusElement.className =
                        `shared-driver-button-status status-${statusClass}`;
                }

                if (
                    driverId === currentDriver &&
                    currentStatusElement
                ) {
                    currentStatusElement.textContent =
                        status;

                    currentStatusElement.className =
                        `shared-current-status status-${statusClass}`;
                }
            },
            (error) => {
                console.error(
                    `Unable to load ${driverId}:`,
                    error
                );
            }
        );
    });
}

createDriverSwitcher();
listenToDriverStatuses();