import { db } from "../firebase/firebase-config.js";

import {
    collection,
    onSnapshot,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import {
    getCurrentDriver
} from "./driver-session.js";
const CURRENT_DRIVER = getCurrentDriver();

console.log(
    "Completed Trips Driver:",
    CURRENT_DRIVER
);
// Change this only if your driver document ID is different.
const CURRENT_DRIVER_ID = "driver1";

const completedTripsContainer =
    document.getElementById("completedTripsContainer");

const completedTripCount =
    document.getElementById("completedTripCount");

const todayTripCount =
    document.getElementById("todayTripCount");

const completionRate =
    document.getElementById("completionRate");

const clock =
    document.getElementById("clock");

// ===============================
// Clock
// ===============================

function updateClock() {

    if (!clock) return;

    clock.textContent =
        new Date().toLocaleTimeString();

}

updateClock();

setInterval(updateClock, 1000);

// ===============================
// Firestore Listener
// ===============================

const completedTripsQuery = query(
    collection(db, "alerts"),
    orderBy("timestamp", "desc")
);

onSnapshot(
    completedTripsQuery,

    (snapshot) => {

        const completedTrips = [];

        snapshot.forEach((documentSnapshot) => {

            const trip = documentSnapshot.data();

            const belongsToCurrentDriver =
                trip.assignedDriver === CURRENT_DRIVER_ID;

            const isCompleted =
                trip.status === "Completed";

            if (
                belongsToCurrentDriver &&
                isCompleted
            ) {

                completedTrips.push({
                    id: documentSnapshot.id,
                    ...trip
                });

            }

        });

        renderCompletedTrips(completedTrips);

    },

    (error) => {

        console.error(
            "Completed trips listener error:",
            error
        );

        completedTripsContainer.innerHTML = `

            <div class="completed-empty">

                <div class="completed-empty-icon">
                    ❌
                </div>

                <h2>Unable to Load Trips</h2>

                <p>
                    ${escapeHTML(error.message)}
                </p>

            </div>

        `;

    }
);

// ===============================
// Render Completed Trips
// ===============================

function renderCompletedTrips(trips) {

    completedTripCount.textContent =
        trips.length;

    const today = new Date();

    const completedToday = trips.filter((trip) => {

        const completedDate =
            getTripDate(trip);

        if (!completedDate) return false;

        return (
            completedDate.getDate() === today.getDate() &&
            completedDate.getMonth() === today.getMonth() &&
            completedDate.getFullYear() === today.getFullYear()
        );

    }).length;

    todayTripCount.textContent =
        completedToday;

    completionRate.textContent =
        trips.length > 0 ? "100%" : "0%";

    if (trips.length === 0) {

        completedTripsContainer.innerHTML = `

            <div class="completed-empty">

                <div class="completed-empty-icon">
                    📋
                </div>

                <h2>No Completed Trips Yet</h2>

                <p>
                    Trips marked as Completed will appear here.
                </p>

            </div>

        `;

        return;

    }

    completedTripsContainer.innerHTML =
        trips.map(createCompletedTripCard).join("");

}

// ===============================
// Create Trip Card
// ===============================

function createCompletedTripCard(trip) {

    const tripDate =
        getTripDate(trip);

    const formattedDate =
        tripDate
            ? tripDate.toLocaleDateString()
            : "Not Available";

    const formattedTime =
        tripDate
            ? tripDate.toLocaleTimeString()
            : "Not Available";

    const emergencyType =
        trip.emergencyType || "Emergency";

    const patientName =
        trip.patientName || "Unknown Patient";

    const phone =
        trip.phone || "Not Available";

    const hospital =
        trip.hospital || "Not Available";

    const symptoms =
        trip.symptoms || "Not Provided";

    const driverName =
        trip.driverName || CURRENT_DRIVER_ID;

    return `

        <div class="completed-trip-card">

            <div class="completed-trip-top">

                <div>

                    <span class="completed-badge">

                        <i class="fa-solid fa-circle-check"></i>

                        Completed

                    </span>

                    <h3>
                        ${escapeHTML(emergencyType)}
                    </h3>

                </div>

                <div class="completed-date">

                    <i class="fa-solid fa-calendar-days"></i>

                    ${escapeHTML(formattedDate)}

                </div>

            </div>

            <div class="completed-trip-grid">

                <div class="trip-detail">

                    <span>Patient</span>

                    <strong>
                        ${escapeHTML(patientName)}
                    </strong>

                </div>

                <div class="trip-detail">

                    <span>Phone</span>

                    <strong>
                        ${escapeHTML(phone)}
                    </strong>

                </div>

                <div class="trip-detail">

                    <span>Hospital</span>

                    <strong>
                        ${escapeHTML(hospital)}
                    </strong>

                </div>

                <div class="trip-detail">

                    <span>Completed Time</span>

                    <strong>
                        ${escapeHTML(formattedTime)}
                    </strong>

                </div>

                <div class="trip-detail">

                    <span>Driver</span>

                    <strong>
                        ${escapeHTML(driverName)}
                    </strong>

                </div>

                <div class="trip-detail">

                    <span>Trip ID</span>

                    <strong>
                        ${escapeHTML(trip.id.substring(0, 8))}
                    </strong>

                </div>

            </div>

            <div class="completed-symptoms">

                <span>Reported Symptoms</span>

                <p>
                    ${escapeHTML(symptoms)}
                </p>

            </div>

            <div class="completed-trip-footer">

                <span>

                    <i class="fa-solid fa-shield-heart"></i>

                    Emergency successfully completed

                </span>

                ${
                    phone !== "Not Available"
                        ? `
                            <a
                                href="tel:${escapeAttribute(phone)}"
                                class="completed-call-button"
                            >

                                <i class="fa-solid fa-phone"></i>

                                Call Patient

                            </a>
                        `
                        : ""
                }

            </div>

        </div>

    `;

}

// ===============================
// Get Trip Completion Date
// ===============================

function getTripDate(trip) {

    const possibleDates = [
        trip.completedAt,
        trip.arrivedAt,
        trip.timestamp
    ];

    for (const value of possibleDates) {

        if (
            value &&
            typeof value.toDate === "function"
        ) {

            return value.toDate();

        }

        if (value instanceof Date) {

            return value;

        }

    }

    return null;

}

// ===============================
// Security Helpers
// ===============================

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}

function escapeAttribute(value) {

    return String(value)
        .replace(/[^0-9+() -]/g, "");

}