// ===============================
// Driver Module
// ===============================

import { db } from "../firebase/firebase-config.js";

import {

collection,
getDocs

}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

export async function loadDriver(){

    const snap = await getDocs(collection(db,"drivers"));

    if(snap.empty){

        alert("No Driver Found");

        return null;

    }

    const driver = snap.docs[0].data();

    document.getElementById("driverName").textContent =
    driver.name;

    document.getElementById("driverPhone").textContent =
    driver.phone;

    document.getElementById("driverVehicle").textContent =
    driver.ambulanceNo;

    document.getElementById("driverLicense").textContent =
    driver.license;

    document.getElementById("driverExperience").textContent =
    driver.experience;

    const badge =
    document.getElementById("driverStatus");

    badge.textContent =
    driver.status;

    badge.className =
    "statusBadge";

    switch(driver.status){

        case "Available":
            badge.style.background="#22c55e";
            break;

        case "On Duty":
            badge.style.background="#f59e0b";
            break;

        case "Emergency":
            badge.style.background="#dc2626";
            break;

        default:
            badge.style.background="#6b7280";

    }

    return driver;

}