import { db } from "../firebase/firebase-config.js";
import {
    doc,
    getDoc,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import { initMap } from "./ambulance-map.js";
import { startAnimation } from "./ambulance/animation.js";
import { setupButtons } from "./ambulance/actions.js";
//import { allocateDriver } from "./ambulance/allocator.js";
async function startTracking(){

    // -------------------------
    // Emergency ID
    // -------------------------

    const params = new URLSearchParams(window.location.search);

    const id = params.get("id");

    if(!id){
        alert("Emergency ID Missing");
        return;
    }

    // -------------------------
    // Emergency Data
    // -------------------------

    const emergencyRef = doc(db,"alerts",id);

    const snap = await getDoc(emergencyRef);

    if(!snap.exists()){
        alert("Emergency Not Found");
        return;
    }

    const emergency = snap.data();

    // -------------------------
    // Driver
    // -------------------------

  const drivers = await getDocs(collection(db, "drivers"));

if (drivers.empty) {
    alert("No Driver Found");
    return;
}

const driver = drivers.docs[0].data();

    // -------------------------
    // Driver Details
    // -------------------------

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

    document.getElementById("driverStatus").textContent =
        driver.status;

    // -------------------------
    // Patient Details
    // -------------------------

    document.getElementById("patientName").innerHTML =
        `<b>Name :</b> ${emergency.patientName}`;

    document.getElementById("patientEmergency").innerHTML =
        `<b>Emergency :</b> ${emergency.emergencyType}`;

    document.getElementById("patientHospital").innerHTML =
        `<b>Hospital :</b> ${emergency.hospital}`;

    // -------------------------
    // Hospital Coordinates
    // -------------------------


const hospitals = {

    "City Hospital": {
        lat: 16.5062,
        lng: 80.6480
    },

    "Apollo Hospital": {
        lat: 16.5048,
        lng: 80.6466
    },

    "Government Hospital": {
        lat: 16.5184,
        lng: 80.6379
    },

    "Life Care Hospital": {
        lat: 16.4955,
        lng: 80.6673
    }

};
    let hospital = hospitals[emergency.hospital];

// If hospital name doesn't exist, find nearest hospital
if (!hospital) {

    let nearest = null;
    let minDistance = Infinity;

    for (const name in hospitals) {

        const h = hospitals[name];

        const d = Math.sqrt(
            Math.pow(h.lat - emergency.latitude, 2) +
            Math.pow(h.lng - emergency.longitude, 2)
        );

        if (d < minDistance) {

            minDistance = d;
            nearest = h;

        }

    }

    hospital = nearest;

}

    // -------------------------
    // Load Map
    // -------------------------

    const mapData = initMap(
        

        hospital.lat,
        hospital.lng,

        emergency.latitude,
        emergency.longitude,

        emergency.patientName
    );

    // -------------------------
    // Start Ambulance
    // -------------------------

    startAnimation(

    mapData.map,

    mapData.ambulance,

    mapData.routingControl,

    mapData.hospitalLat,

    mapData.hospitalLng,

    mapData.patientLat,

    mapData.patientLng,

    emergencyRef

);
    // -------------------------
    // Buttons
    // -------------------------

    setupButtons(emergencyRef);

}

startTracking();