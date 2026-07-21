import { db } from "../firebase/firebase-config.js";

import {
    collection,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const activeCount = document.getElementById("activeCount");
const patientCount = document.getElementById("patientCount");
const billCount = document.getElementById("billCount");
const revenue = document.getElementById("revenue");

const liveEmergencies = document.getElementById("liveEmergencies");
const activities = document.getElementById("activities");

// --------------------
// Alerts
// --------------------

onSnapshot(collection(db, "alerts"), (snapshot) => {

    let active = 0;

    liveEmergencies.innerHTML = "";

    activities.innerHTML = "";

    snapshot.forEach((doc) => {

        const data = doc.data();

        if (data.status !== "Completed") {

            active++;

        }

        liveEmergencies.innerHTML += `

        <div class="live-card">

            <h4>${data.name}</h4>

            <p><b>Emergency:</b> ${data.emergency}</p>

            <p><b>Status:</b> ${data.status}</p>

            <p><b>Hospital:</b> ${data.hospital}</p>

        </div>

        `;

        activities.innerHTML += `

        <div class="activity">

            🚨 ${data.name} submitted an emergency

        </div>

        `;

    });

    activeCount.innerText = active;

});

// --------------------
// Patients
// --------------------

onSnapshot(collection(db, "patients"), (snapshot) => {

    patientCount.innerText = snapshot.size;

});

// --------------------
// Bills
// --------------------

onSnapshot(collection(db, "bills"), (snapshot) => {

    let totalRevenue = 0;

    billCount.innerText = snapshot.size;

    snapshot.forEach((doc) => {

        const bill = doc.data();

        if (bill.paymentStatus === "Paid") {

            totalRevenue += Number(bill.grandTotal || 0);

        }

    });

    revenue.innerText = "₹ " + totalRevenue;

});