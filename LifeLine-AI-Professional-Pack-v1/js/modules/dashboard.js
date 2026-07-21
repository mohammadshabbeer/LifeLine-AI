import { db } from "../firebase/firebase-config.js";
import {
    requireHospitalLogin,
    isAlertForHospital,
    logoutHospital
} from "./hospital-session.js";

import {
    collection,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const currentHospital = requireHospitalLogin();
if (!currentHospital) throw new Error("Hospital login required.");

const activeCount = document.getElementById("activeCount");
const patientCount = document.getElementById("patientCount");
const billCount = document.getElementById("billCount");
const revenue = document.getElementById("revenue");
const liveEmergencies = document.getElementById("liveEmergencies");
const activities = document.getElementById("activities");

const title = document.getElementById("dashboardHospitalName");
const welcome = document.getElementById("dashboardHospitalWelcome");
const logoutButton = document.getElementById("dashboardHospitalLogout");

if (title) title.textContent = currentHospital.name;
if (welcome) welcome.textContent = `${currentHospital.name} Admin`;
logoutButton?.addEventListener("click", (event) => {
    event.preventDefault();
    logoutHospital();
});

onSnapshot(collection(db, "alerts"), (snapshot) => {
    let active = 0;
    let visibleCount = 0;

    liveEmergencies.innerHTML = "";
    activities.innerHTML = "";

    snapshot.forEach((documentSnapshot) => {
        const data = documentSnapshot.data();
        if (!isAlertForHospital(data, currentHospital)) return;

        visibleCount++;

        if (data.status !== "Completed" && data.status !== "Rejected") {
            active++;
        }

        liveEmergencies.innerHTML += `
            <div class="live-card">
                <h4>${data.patientName || "Unknown Patient"}</h4>
                <p><b>Emergency:</b> ${data.emergencyType || "-"}</p>
                <p><b>Status:</b> ${data.status || "Pending"}</p>
                <p><b>Hospital:</b> ${data.hospital || currentHospital.name}</p>
            </div>
        `;

        activities.innerHTML += `
            <div class="activity">
                🚨 ${data.patientName || "A patient"} submitted a ${data.emergencyType || "medical"} emergency
            </div>
        `;
    });

    if (visibleCount === 0) {
        liveEmergencies.innerHTML = `No emergencies for ${currentHospital.name}.`;
        activities.innerHTML = "Waiting for hospital activity...";
    }

    activeCount.innerText = active;
});

// Existing patient and billing records do not yet contain a hospital field,
// so these totals remain global to avoid hiding valid existing records.
onSnapshot(collection(db, "patients"), (snapshot) => {
    patientCount.innerText = snapshot.size;
});

onSnapshot(collection(db, "bills"), (snapshot) => {
    let totalRevenue = 0;
    billCount.innerText = snapshot.size;

    snapshot.forEach((documentSnapshot) => {
        const bill = documentSnapshot.data();
        if (bill.paymentStatus === "Paid") {
            totalRevenue += Number(bill.grandTotal || 0);
        }
    });

    revenue.innerText = "₹ " + totalRevenue;
});
