import { db } from "../firebase/firebase-config.js";

import {
    doc,
    getDoc,
    collection,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import { initMap } from "./ambulance-map.js";
import { startAnimation } from "./ambulance/animation.js";
import { setupButtons } from "./ambulance/actions.js";

const HOSPITALS = Object.freeze({
    "City Hospital": {
        lat: 16.5062,
        lng: 80.6480
    },
    "Apollo Hospital": {
        lat: 16.5048,
        lng: 80.6466
    },
    "Care Hospital": {
        lat: 16.5098,
        lng: 80.6416
    },
    "Yashoda Hospital": {
        lat: 16.5184,
        lng: 80.6379
    },
    "Government Hospital": {
        lat: 16.5184,
        lng: 80.6379
    },
    "Life Care Hospital": {
        lat: 16.4955,
        lng: 80.6673
    }
});

const DEFAULT_DRIVERS = [
    {
        id: "driver1",
        name: "Ramesh Kumar (Driver 1)",
        ambulanceNo: "TS 09 EA 1001",
        vehicleType: "Advanced Life Support (ALS)",
        phone: "+91 98765 43210",
        license: "TS-DL-2019-009182",
        experience: "5 Years",
        emergenciesHandled: 142,
        hospital: "Apollo Hospital",
        status: "Available"
    },
    {
        id: "driver2",
        name: "Suresh Reddy (Driver 2)",
        ambulanceNo: "TS 09 EB 2002",
        vehicleType: "Basic Life Support (BLS)",
        phone: "+91 98765 43211",
        license: "TS-DL-2017-004319",
        experience: "7 Years",
        emergenciesHandled: 215,
        hospital: "Care Hospital",
        status: "Available"
    },
    {
        id: "driver3",
        name: "Mohd Abdul (Driver 3)",
        ambulanceNo: "TS 09 EC 3003",
        vehicleType: "Advanced Life Support (ALS)",
        phone: "+91 98765 43212",
        license: "TS-DL-2020-008472",
        experience: "4 Years",
        emergenciesHandled: 98,
        hospital: "Yashoda Hospital",
        status: "Available"
    }
];

function getEmergencyCoordinates(emergency) {
    const latitude = Number(
        emergency?.latitude ??
        emergency?.lat ??
        emergency?.coordinates?.latitude ??
        emergency?.coordinates?.lat
    );

    const longitude = Number(
        emergency?.longitude ??
        emergency?.lng ??
        emergency?.coordinates?.longitude ??
        emergency?.coordinates?.lng
    );

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
    }

    return {
        latitude,
        longitude
    };
}

async function getAssignedDriver(emergency) {
    const driverId = String(
        emergency?.assignedDriver ||
        emergency?.driverId ||
        ""
    ).trim();

    if (!driverId) {
        throw new Error(
            "No driver has been assigned to this emergency."
        );
    }

    const driverSnapshot = await getDoc(
        doc(db, "drivers", driverId)
    );

    if (!driverSnapshot.exists()) {
        throw new Error(
            `Assigned driver profile was not found: ${driverId}`
        );
    }

    return {
        id: driverSnapshot.id,
        ...driverSnapshot.data()
    };
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent =
            value ?? "Not available";
    }
}

function initHospitalFleetView() {
    const fleetView = document.getElementById("hospitalFleetView");
    const trackingView = document.getElementById("liveTrackingView");
    const rosterGrid = document.getElementById("driversRosterGrid");

    if (fleetView) fleetView.style.display = "block";
    if (trackingView) trackingView.style.display = "none";

    const driversRef = collection(db, "drivers");

    onSnapshot(driversRef, (snapshot) => {
        const driversMap = new Map();

        DEFAULT_DRIVERS.forEach((d) => driversMap.set(d.id, { ...d }));

        snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            const existing = driversMap.get(id) || {};
            driversMap.set(id, {
                ...existing,
                id,
                name: data.name || data.driverName || existing.name || `Driver ${id}`,
                ambulanceNo: data.ambulanceNo || data.vehicle || data.vehicleNumber || existing.ambulanceNo || "TS 09 AM 0001",
                vehicleType: data.vehicleType || existing.vehicleType || "ALS Emergency Ambulance",
                phone: data.phone || existing.phone || "+91 98765 00000",
                license: data.license || existing.license || "TS-DL-PROJ-001",
                experience: data.experience || existing.experience || "4+ Years",
                emergenciesHandled: data.emergenciesHandled || data.totalTrips || existing.emergenciesHandled || 100,
                status: data.status || existing.status || "Available",
                assignedEmergency: data.assignedEmergency || null,
                assignedHospital: data.assignedHospital || existing.hospital || "Hospital Fleet"
            });
        });

        const driversList = Array.from(driversMap.values());

        let availableCount = 0;
        let busyCount = 0;
        let totalTrips = 0;

        driversList.forEach((d) => {
            const st = String(d.status || "").toLowerCase();
            if (st === "available") availableCount++;
            else if (["busy", "assigned", "dispatched", "accepted"].includes(st)) busyCount++;
            totalTrips += Number(d.emergenciesHandled || 0);
        });

        const fleetTotalEl = document.getElementById("fleetTotal");
        const fleetAvailEl = document.getElementById("fleetAvailable");
        const fleetBusyEl = document.getElementById("fleetBusy");
        const fleetTripsEl = document.getElementById("fleetTotalTrips");

        if (fleetTotalEl) fleetTotalEl.textContent = `${driversList.length} Units`;
        if (fleetAvailEl) fleetAvailEl.textContent = availableCount;
        if (fleetBusyEl) fleetBusyEl.textContent = busyCount;
        if (fleetTripsEl) fleetTripsEl.textContent = totalTrips;

        if (rosterGrid) {
            rosterGrid.innerHTML = driversList.map((d) => {
                const statusClass = String(d.status || "Available").toLowerCase().replace(/\s+/g, "-");
                const isBusy = ["busy", "assigned", "dispatched", "accepted"].includes(statusClass);

                return `
                    <article class="roster-driver-card">
                        <div class="driver-card-header">
                            <div class="driver-avatar">
                                <i class="fa-solid fa-truck-medical"></i>
                            </div>
                            <div class="driver-info-main">
                                <h3>${d.name}</h3>
                                <span class="driver-id-tag">ID: ${d.id}</span>
                            </div>
                        </div>

                        <div class="driver-details-list">
                            <div class="driver-detail-row">
                                <label><i class="fa-solid fa-signal"></i> Live Status</label>
                                <span class="roster-status-badge ${statusClass}">
                                    ${d.status === "Available" ? "🟢 Available" : isBusy ? "🟠 On Duty / Busy" : "🔴 " + d.status}
                                </span>
                            </div>

                            <div class="driver-detail-row">
                                <label><i class="fa-solid fa-van-shuttle"></i> Vehicle</label>
                                <span>${d.ambulanceNo}</span>
                            </div>

                            <div class="driver-detail-row">
                                <label><i class="fa-solid fa-kit-medical"></i> Type</label>
                                <span>${d.vehicleType || "ALS Ambulance"}</span>
                            </div>

                            <div class="driver-detail-row">
                                <label><i class="fa-solid fa-briefcase"></i> Experience</label>
                                <span>${d.experience}</span>
                            </div>

                            <div class="driver-detail-row">
                                <label><i class="fa-solid fa-trophy"></i> Emergencies Handled</label>
                                <span><strong>${d.emergenciesHandled}</strong> Cases</span>
                            </div>

                            <div class="driver-detail-row">
                                <label><i class="fa-solid fa-phone"></i> Contact</label>
                                <span>${d.phone}</span>
                            </div>

                            <div class="driver-detail-row">
                                <label><i class="fa-solid fa-id-card"></i> License</label>
                                <span>${d.license}</span>
                            </div>
                        </div>

                        ${isBusy && d.assignedEmergency ? `
                            <a href="ambulance-map.html?id=${encodeURIComponent(d.assignedEmergency)}" class="driver-track-link">
                                <i class="fa-solid fa-map-location-dot"></i> Track Active Emergency
                            </a>
                        ` : ""}
                    </article>
                `;
            }).join("");
        }
    });
}

async function startTracking(emergencyId) {
    try {
        const fleetView = document.getElementById("hospitalFleetView");
        const trackingView = document.getElementById("liveTrackingView");

        if (fleetView) fleetView.style.display = "none";
        if (trackingView) trackingView.style.display = "block";

        const emergencyReference = doc(db, "alerts", emergencyId);
        const emergencySnapshot = await getDoc(emergencyReference);

        if (!emergencySnapshot.exists()) {
            throw new Error("Emergency record was not found.");
        }

        const emergency = emergencySnapshot.data();
        const patientCoordinates = getEmergencyCoordinates(emergency);

        if (!patientCoordinates) {
            throw new Error("Patient GPS coordinates are missing from this emergency.");
        }

        const driver = await getAssignedDriver(emergency);

        setText("driverName", driver.name || driver.driverName || driver.id);
        setText("driverPhone", driver.phone);
        setText("driverVehicle", driver.ambulanceNo || driver.vehicle || driver.vehicleNumber);
        setText("driverLicense", driver.license);
        setText("driverExperience", driver.experience);
        setText("driverStatus", driver.status);

        const patientName = emergency.patientName || "Unknown Patient (SOS)";
        document.getElementById("patientName").innerHTML = `<b>Name :</b> ${patientName}`;
        document.getElementById("patientEmergency").innerHTML = `<b>Emergency :</b> ${emergency.emergencyType || "Emergency"}`;
        document.getElementById("patientHospital").innerHTML = `<b>Hospital :</b> ${emergency.hospital || "Hospital"}`;

function getHospitalCoordinates(hospitalName) {
    if (!hospitalName) return HOSPITALS["City Hospital"];
    if (HOSPITALS[hospitalName]) return HOSPITALS[hospitalName];

    const cleanInput = String(hospitalName).trim().toLowerCase();
    for (const [key, coords] of Object.entries(HOSPITALS)) {
        const cleanKey = key.toLowerCase();
        if (cleanKey === cleanInput || cleanKey.includes(cleanInput) || cleanInput.includes(cleanKey.replace(/\s*hospital\s*/gi, ""))) {
            return coords;
        }
    }
    return HOSPITALS["City Hospital"];
}

        const hospital = getHospitalCoordinates(emergency.hospital);

        const mapData = initMap(
            hospital.lat,
            hospital.lng,
            patientCoordinates.latitude,
            patientCoordinates.longitude,
            patientName
        );

        startAnimation(
            mapData.map,
            mapData.ambulance,
            mapData.routingControl,
            mapData.hospitalLat,
            mapData.hospitalLng,
            mapData.patientLat,
            mapData.patientLng,
            emergencyReference
        );

        setupButtons(emergencyReference);
    } catch (error) {
        console.error("Ambulance tracking failed:", error);
        const status = document.getElementById("status");
        if (status) status.textContent = error.message;
        alert(`Unable to start navigation: ${error.message}`);
    }
}

const parameters = new URLSearchParams(window.location.search);
const emergencyId = parameters.get("id");

if (emergencyId) {
    startTracking(emergencyId);
} else {
    initHospitalFleetView();
}
