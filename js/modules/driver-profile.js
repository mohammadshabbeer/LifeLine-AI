import { db } from "../firebase/firebase-config.js";
import { getCurrentDriver } from "./driver-session.js";
import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    query,
    updateDoc,
    orderBy
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const CURRENT_DRIVER = getCurrentDriver();

console.log(
    "Profile Driver:",
    CURRENT_DRIVER
);
// ========================================
// CURRENT DRIVER
// ========================================

const CURRENT_DRIVER_ID = CURRENT_DRIVER;

// ========================================
// PAGE ELEMENTS
// ========================================

const clock = document.getElementById("clock");

const profileLoadingOverlay =
    document.getElementById("profileLoadingOverlay");

const profileDriverName =
    document.getElementById("profileDriverName");

const profileDriverId =
    document.getElementById("profileDriverId");

const profileFullName =
    document.getElementById("profileFullName");

const profilePhone =
    document.getElementById("profilePhone");

const profileEmail =
    document.getElementById("profileEmail");

const profileAddress =
    document.getElementById("profileAddress");

const profileExperience =
    document.getElementById("profileExperience");

const profileVehicleNumber =
    document.getElementById("profileVehicleNumber");

const profileVehicleType =
    document.getElementById("profileVehicleType");

const profileLicenseNumber =
    document.getElementById("profileLicenseNumber");

const profileAssignedHospital =
    document.getElementById("profileAssignedHospital");

const profileJoiningDate =
    document.getElementById("profileJoiningDate");

const profileJoinedDate =
    document.getElementById("profileJoinedDate");

const profileLocation =
    document.getElementById("profileLocation");

const profileStatusBadge =
    document.getElementById("profileStatusBadge");

const profileOnlineIndicator =
    document.getElementById("profileOnlineIndicator");

const profileDriverStatusSelect =
    document.getElementById("profileDriverStatusSelect");

const profileStatusMessage =
    document.getElementById("profileStatusMessage");

// Statistics

const profileTotalTrips =
    document.getElementById("profileTotalTrips");

const profileCompletedTrips =
    document.getElementById("profileCompletedTrips");

const profileActiveTrips =
    document.getElementById("profileActiveTrips");

const profileRejectedTrips =
    document.getElementById("profileRejectedTrips");

const profilePendingTrips =
    document.getElementById("profilePendingTrips");

const profileSuccessRate =
    document.getElementById("profileSuccessRate");

const profileCompletionProgress =
    document.getElementById("profileCompletionProgress");

const profileCompletionProgressText =
    document.getElementById("profileCompletionProgressText");

const profileReliabilityProgress =
    document.getElementById("profileReliabilityProgress");

const profileReliabilityText =
    document.getElementById("profileReliabilityText");

// Buttons

const editProfileButton =
    document.getElementById("editProfileButton");

const refreshProfileButton =
    document.getElementById("refreshProfileButton");

const profileCallHospitalButton =
    document.getElementById("profileCallHospitalButton");

const profileLogoutButton =
    document.getElementById("profileLogoutButton");

// Modal

const editProfileModal =
    document.getElementById("editProfileModal");

const closeProfileModalButton =
    document.getElementById("closeProfileModalButton");

const cancelProfileEditButton =
    document.getElementById("cancelProfileEditButton");

const editProfileForm =
    document.getElementById("editProfileForm");

// Form Inputs

const editDriverName =
    document.getElementById("editDriverName");

const editDriverPhone =
    document.getElementById("editDriverPhone");

const editDriverEmail =
    document.getElementById("editDriverEmail");

const editDriverAddress =
    document.getElementById("editDriverAddress");

const editDriverVehicle =
    document.getElementById("editDriverVehicle");

const editDriverLicense =
    document.getElementById("editDriverLicense");

const editDriverExperience =
    document.getElementById("editDriverExperience");

const editDriverHospital =
    document.getElementById("editDriverHospital");

// Toast

const profileToast =
    document.getElementById("profileToast");

const profileToastMessage =
    document.getElementById("profileToastMessage");

const profileToastIcon =
    document.getElementById("profileToastIcon");

// ========================================
// LOCAL DATA
// ========================================

let currentDriverData = null;
let toastTimer = null;

// ========================================
// CLOCK
// ========================================

function updateClock() {

    if (!clock) return;

    clock.textContent =
        new Date().toLocaleTimeString();

}

updateClock();

setInterval(updateClock, 1000);

// ========================================
// DRIVER DOCUMENT LISTENER
// ========================================

const driverReference =
    doc(db, "drivers", CURRENT_DRIVER_ID);

onSnapshot(
    driverReference,

    (driverSnapshot) => {

        if (!driverSnapshot.exists()) {

            hideLoading();

            showToast(
                "Driver document not found in Firestore.",
                "error"
            );

            return;

        }

        currentDriverData = driverSnapshot.data();

        renderDriverProfile(currentDriverData);

        hideLoading();

    },

    (error) => {

        console.error(
            "Driver profile listener error:",
            error
        );

        hideLoading();

        showToast(
            error.message,
            "error"
        );

    }
);

// ========================================
// ALERTS LISTENER FOR DRIVER STATISTICS
// ========================================

const alertsQuery = query(
    collection(db, "alerts"),
    orderBy("timestamp", "desc")
);

onSnapshot(
    alertsQuery,

    (snapshot) => {

        const driverTrips = [];

        snapshot.forEach((documentSnapshot) => {

            const emergency =
                documentSnapshot.data();

            const belongsToCurrentDriver =
                emergency.assignedDriver === CURRENT_DRIVER_ID ||
                emergency.driverId === CURRENT_DRIVER_ID ||
                emergency.rejectedByDriver === CURRENT_DRIVER_ID;

            if (belongsToCurrentDriver) {
                driverTrips.push({
                    id: documentSnapshot.id,
                    ...emergency
                });
            }

        });

        calculateDriverStatistics(driverTrips);

    },

    (error) => {

        console.error(
            "Driver statistics listener error:",
            error
        );

    }
);

// ========================================
// RENDER DRIVER PROFILE
// ========================================

function renderDriverProfile(driver) {

    const driverName =
        driver.name ||
        driver.driverName ||
        "LifeLine Driver";

    const driverPhone =
        driver.phone ||
        "Not available";

    const driverEmail =
        driver.email ||
        "Not available";

    const driverAddress =
        driver.address ||
        "Not available";

    const driverExperience =
        driver.experience ||
        "Not available";

    const driverVehicle =
        driver.ambulanceNo ||
        driver.vehicle ||
        driver.vehicleNumber ||
        "Not assigned";

    const driverVehicleType =
        driver.vehicleType ||
        "Emergency Ambulance";

    const driverLicense =
        driver.license ||
        driver.licenseNumber ||
        "Not available";

    const driverHospital =
        driver.hospital ||
        driver.assignedHospital ||
        "Not assigned";

    const driverLocation =
        driver.location ||
        driver.city ||
        driverHospital ||
        "Location not available";

    const driverStatus =
        driver.status ||
        "Unavailable";

    const joiningDate =
        getFormattedDate(
            driver.joinedAt ||
            driver.joiningDate ||
            driver.createdAt
        );

    profileDriverName.textContent =
        driverName;

    profileDriverId.textContent =
        CURRENT_DRIVER_ID;

    profileFullName.textContent =
        driverName;

    profilePhone.textContent =
        driverPhone;

    profileEmail.textContent =
        driverEmail;

    profileAddress.textContent =
        driverAddress;

    profileExperience.textContent =
        driverExperience;

    profileVehicleNumber.textContent =
        driverVehicle;

    profileVehicleType.textContent =
        driverVehicleType;

    profileLicenseNumber.textContent =
        driverLicense;

    profileAssignedHospital.textContent =
        driverHospital;

    profileLocation.textContent =
        driverLocation;

    profileJoiningDate.textContent =
        joiningDate;

    profileJoinedDate.textContent =
        joiningDate;

    profileDriverStatusSelect.value =
        driverStatus;

    updateStatusUI(driverStatus);

}

// ========================================
// DRIVER STATUS UI
// ========================================

function updateStatusUI(status) {

    const normalizedStatus =
        String(status || "Unavailable").toLowerCase();

    profileStatusBadge.classList.remove(
        "available",
        "busy",
        "unavailable",
        "leave"
    );

    if (normalizedStatus === "available") {

        profileStatusBadge.classList.add("available");

        profileStatusBadge.textContent =
            "Available";

        profileOnlineIndicator.style.background =
            "#24c875";

        return;

    }

    if (normalizedStatus === "busy") {

        profileStatusBadge.classList.add("busy");

        profileStatusBadge.textContent =
            "Busy";

        profileOnlineIndicator.style.background =
            "#f59e0b";

        return;

    }

    if (normalizedStatus === "leave") {

        profileStatusBadge.classList.add("leave");

        profileStatusBadge.textContent =
            "Leave";

        profileOnlineIndicator.style.background =
            "#8b5cf6";

        return;

    }

    profileStatusBadge.classList.add(
        "unavailable"
    );

    profileStatusBadge.textContent =
        "Unavailable";

    profileOnlineIndicator.style.background =
        "#ef4444";

}

// ========================================
// STATUS UPDATE
// ========================================

profileDriverStatusSelect.addEventListener(
    "change",

    async () => {

        const selectedStatus =
            profileDriverStatusSelect.value;

        profileDriverStatusSelect.disabled =
            true;

        profileStatusMessage.textContent =
            "Updating status...";

        try {

            await updateDoc(
                driverReference,
                {
                    status: selectedStatus,
                    statusUpdatedAt: new Date()
                }
            );

            updateStatusUI(selectedStatus);

            profileStatusMessage.textContent =
                "Status updated successfully.";

            showToast(
                `Driver status changed to ${selectedStatus}.`
            );

        }
        catch (error) {

            console.error(
                "Status update error:",
                error
            );

            profileStatusMessage.textContent =
                "Unable to update status.";

            if (
                currentDriverData &&
                currentDriverData.status
            ) {

                profileDriverStatusSelect.value =
                    currentDriverData.status;

            }

            showToast(
                error.message,
                "error"
            );

        }
        finally {

            profileDriverStatusSelect.disabled =
                false;

        }

    }
);

// ========================================
// CALCULATE DRIVER STATISTICS
// ========================================

function calculateDriverStatistics(trips) {

    const normalize = (value) =>
        String(value || "").trim().toLowerCase();

    const getTripStates = (trip) => [
        normalize(trip.status),
        normalize(trip.driverStatus)
    ];

    const completedTrips = trips.filter((trip) =>
        getTripStates(trip).includes("completed")
    ).length;

    const rejectedTrips = trips.filter((trip) =>
        getTripStates(trip).includes("rejected") ||
        trip.rejectedByDriver === CURRENT_DRIVER_ID
    ).length;

    const pendingTrips = trips.filter((trip) => {
        const states = getTripStates(trip);

        return (
            states.includes("pending") ||
            states.includes("waiting")
        ) && !states.includes("rejected");
    }).length;

    const activeTrips = trips.filter((trip) => {
        const states = getTripStates(trip);

        return [
            "accepted",
            "dispatched",
            "ambulance accepted",
            "en route",
            "near patient",
            "arrived",
            "in progress"
        ].some((state) => states.includes(state));
    }).length;

    const totalTrips = trips.length;

    const successRate =
        totalTrips > 0
            ? Math.round((completedTrips / totalTrips) * 100)
            : 0;

    const respondedTrips = completedTrips + activeTrips;

    const reliabilityRate =
        totalTrips > 0
            ? Math.round((respondedTrips / totalTrips) * 100)
            : 0;

    profileTotalTrips.textContent = totalTrips;
    profileCompletedTrips.textContent = completedTrips;
    profileActiveTrips.textContent = activeTrips;
    profileRejectedTrips.textContent = rejectedTrips;
    profilePendingTrips.textContent = pendingTrips;
    profileSuccessRate.textContent = `${successRate}%`;
    profileCompletionProgress.style.width = `${successRate}%`;
    profileCompletionProgressText.textContent = `${successRate}%`;
    profileReliabilityProgress.style.width = `${reliabilityRate}%`;
    profileReliabilityText.textContent = `${reliabilityRate}%`;
}

// ========================================
// OPEN EDIT PROFILE MODAL
// ========================================

editProfileButton.addEventListener(
    "click",

    () => {

        if (!currentDriverData) {

            showToast(
                "Driver data is still loading.",
                "error"
            );

            return;

        }

        editDriverName.value =
            currentDriverData.name ||
            currentDriverData.driverName ||
            "";

        editDriverPhone.value =
            currentDriverData.phone ||
            "";

        editDriverEmail.value =
            currentDriverData.email ||
            "";

        editDriverAddress.value =
            currentDriverData.address ||
            "";

        editDriverVehicle.value =
            currentDriverData.ambulanceNo ||
            currentDriverData.vehicle ||
            currentDriverData.vehicleNumber ||
            "";

        editDriverLicense.value =
            currentDriverData.license ||
            currentDriverData.licenseNumber ||
            "";

        editDriverExperience.value =
            currentDriverData.experience ||
            "";

        editDriverHospital.value =
            currentDriverData.hospital ||
            currentDriverData.assignedHospital ||
            "";

        openProfileModal();

    }
);

// ========================================
// CLOSE MODAL BUTTONS
// ========================================

closeProfileModalButton.addEventListener(
    "click",
    closeProfileModal
);

cancelProfileEditButton.addEventListener(
    "click",
    closeProfileModal
);

document
    .querySelector(".profile-modal-overlay")
    .addEventListener(
        "click",
        closeProfileModal
    );

document.addEventListener(
    "keydown",

    (event) => {

        if (event.key === "Escape") {

            closeProfileModal();

        }

    }
);

// ========================================
// SAVE PROFILE
// ========================================

editProfileForm.addEventListener(
    "submit",

    async (event) => {

        event.preventDefault();

        const saveButton =
            editProfileForm.querySelector(
                ".profile-save-button"
            );

        saveButton.disabled = true;

        saveButton.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Saving...
        `;

        try {

            await updateDoc(
                driverReference,
                {
                    name: editDriverName.value.trim(),
                    phone: editDriverPhone.value.trim(),
                    email: editDriverEmail.value.trim(),
                    address: editDriverAddress.value.trim(),
                    ambulanceNo: editDriverVehicle.value.trim(),
                    license: editDriverLicense.value.trim(),
                    experience: editDriverExperience.value.trim(),
                    hospital: editDriverHospital.value.trim(),
                    updatedAt: new Date()
                }
            );

            closeProfileModal();

            showToast(
                "Driver profile updated successfully."
            );

        }
        catch (error) {

            console.error(
                "Profile update error:",
                error
            );

            showToast(
                error.message,
                "error"
            );

        }
        finally {

            saveButton.disabled = false;

            saveButton.innerHTML = `
                <i class="fa-solid fa-floppy-disk"></i>
                Save Changes
            `;

        }

    }
);

// ========================================
// REFRESH PROFILE
// ========================================

refreshProfileButton.addEventListener(
    "click",

    async () => {

        refreshProfileButton.disabled = true;

        refreshProfileButton.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Refreshing
        `;

        try {

            const driverSnapshot =
                await getDoc(driverReference);

            if (!driverSnapshot.exists()) {

                throw new Error(
                    "Driver document not found."
                );

            }

            currentDriverData =
                driverSnapshot.data();

            renderDriverProfile(
                currentDriverData
            );

            showToast(
                "Driver profile refreshed."
            );

        }
        catch (error) {

            console.error(
                "Profile refresh error:",
                error
            );

            showToast(
                error.message,
                "error"
            );

        }
        finally {

            refreshProfileButton.disabled =
                false;

            refreshProfileButton.innerHTML = `
                <i class="fa-solid fa-rotate"></i>
                Refresh
            `;

        }

    }
);

// ========================================
// CALL HOSPITAL
// ========================================

profileCallHospitalButton.addEventListener(
    "click",

    () => {

        const hospitalPhone =
            currentDriverData?.hospitalPhone ||
            currentDriverData?.emergencyPhone ||
            "";

        if (!hospitalPhone) {

            showToast(
                "Hospital phone number is not available.",
                "error"
            );

            return;

        }

        window.location.href =
            `tel:${sanitizePhone(hospitalPhone)}`;

    }
);

// ========================================
// LOGOUT PLACEHOLDER
// ========================================

profileLogoutButton.addEventListener(
    "click",

    () => {

        const confirmed =
            confirm(
                "Are you sure you want to leave the Driver Portal?"
            );

        if (!confirmed) return;

        window.location.href =
            "index.html";

    }
);

// ========================================
// MODAL HELPERS
// ========================================

function openProfileModal() {

    editProfileModal.classList.add("show");

    document.body.style.overflow =
        "hidden";

}

function closeProfileModal() {

    editProfileModal.classList.remove("show");

    document.body.style.overflow =
        "";

}

// ========================================
// LOADING HELPER
// ========================================

function hideLoading() {

    if (!profileLoadingOverlay) return;

    profileLoadingOverlay.classList.add(
        "hide"
    );

}

// ========================================
// DATE HELPER
// ========================================

function getFormattedDate(value) {

    if (!value) {

        return "Not available";

    }

    let date = null;

    if (
        typeof value.toDate === "function"
    ) {

        date = value.toDate();

    }
    else if (value instanceof Date) {

        date = value;

    }
    else {

        const parsedDate =
            new Date(value);

        if (
            !Number.isNaN(
                parsedDate.getTime()
            )
        ) {

            date = parsedDate;

        }

    }

    if (!date) {

        return "Not available";

    }

    return date.toLocaleDateString(
        undefined,
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}

// ========================================
// PHONE HELPER
// ========================================

function sanitizePhone(value) {

    return String(value)
        .replace(/[^0-9+]/g, "");

}

// ========================================
// TOAST
// ========================================

function showToast(
    message,
    type = "success"
) {

    clearTimeout(toastTimer);

    profileToast.classList.remove(
        "show",
        "error"
    );

    if (type === "error") {

        profileToast.classList.add(
            "error"
        );

        profileToastIcon.className =
            "fa-solid fa-circle-exclamation";

    }
    else {

        profileToastIcon.className =
            "fa-solid fa-circle-check";

    }

    profileToastMessage.textContent =
        message;

    requestAnimationFrame(() => {

        profileToast.classList.add(
            "show"
        );

    });

    toastTimer = setTimeout(() => {

        profileToast.classList.remove(
            "show"
        );

    }, 3200);

}