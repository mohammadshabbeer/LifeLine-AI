import { db } from "../firebase/firebase-config.js";

import {

collection,
addDoc,
serverTimestamp,
doc,
onSnapshot

} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

let latitude = 17.3850;
let longitude = 78.4867;

const map = L.map("map").setView([latitude, longitude],13);

L.tileLayer(

"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

{

attribution:"© OpenStreetMap"

}

).addTo(map);

let marker=L.marker([latitude,longitude]).addTo(map);

document.getElementById("gpsBtn").addEventListener("click",()=>{

navigator.geolocation.getCurrentPosition(

async(position)=>{

latitude = position.coords.latitude;
longitude = position.coords.longitude;

marker.setLatLng([latitude,longitude]);

map.setView([latitude,longitude],15);

try{

const response = await fetch(

`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`

);

const data = await response.json();

document.getElementById("location").value =

data.display_name;

}
catch{

document.getElementById("location").value =

latitude.toFixed(5)+", "+longitude.toFixed(5);

}

},

()=>{

alert("Location permission denied.");

}

);

});

document

.getElementById("emergencyForm")

.addEventListener("submit",

async(e)=>{

e.preventDefault();

try{

const docRef = await addDoc(

collection(db,"alerts"),

{



patientName:

document.getElementById("name").value,

phone:

document.getElementById("phone").value,

emergencyType:

document.getElementById("emergencyType").value,

symptoms:

document.getElementById("symptoms").value,

location:

document.getElementById("location").value,

latitude,

longitude,

hospital:

document.getElementById("hospital").value,

status:"Pending",

hospitalStatus:"Pending",

driverStatus:"Not Assigned",

driverAssigned:false,

assignedDriver:"",

timestamp: serverTimestamp()

}

);
console.log("New Emergency ID:", docRef.id);

alert("🚑 Emergency Request Sent Successfully");
localStorage.setItem("currentEmergency", docRef.id);
e.target.reset();

document.getElementById("location").value="";

latitude=17.3850;
longitude=78.4867;

marker.setLatLng([latitude,longitude]);

map.setView([latitude,longitude],13);
}

catch(err){

console.error(err);

alert("Submission Failed");

}

});

const emergencyId = localStorage.getItem("currentEmergency");

console.log("Tracking Emergency:", emergencyId);

if (emergencyId) {

    const statusRef = doc(db, "alerts", emergencyId);

    onSnapshot(statusRef, (snap) => {

        if (!snap.exists()) {

            localStorage.removeItem("currentEmergency");
            return;

        }

        const data = snap.data();

        console.log("Full Firestore Data:", data);
console.log("Status =", "[" + data.status + "]");
console.log("Driver Status =", "[" + data.driverStatus + "]");

        // Remove completed/rejected emergency from browser
        if (
            data.status === "Completed" ||
            data.status === "Rejected"
        ) {

            localStorage.removeItem("currentEmergency");

        }

        let message = "";

        document.querySelectorAll(".step").forEach(step => {

            step.classList.remove("active");

        });

        document.querySelectorAll(".line").forEach(line => {

            line.classList.remove("active");

        });

        switch (data.status) {

            case "Pending":

                message = "🟡 Hospital is reviewing your request";

                document.getElementById("stepPending").classList.add("active");

                break;

            case "Accepted":

                message = "✅ Hospital accepted your request";

                document.getElementById("stepPending").classList.add("active");
                document.getElementById("line1").classList.add("active");
                document.getElementById("stepAccepted").classList.add("active");

                break;

            case "Dispatched":

                message="🚑 Ambulance is on the way to your location.";

                document.getElementById("stepPending").classList.add("active");
                document.getElementById("line1").classList.add("active");
                document.getElementById("stepAccepted").classList.add("active");
                document.getElementById("line2").classList.add("active");
                document.getElementById("stepDispatch").classList.add("active");

                // Open only if we are NOT already on ambulance tracking page
                

                break;

            case "Arrived":

                message = "📍 Ambulance has reached your location.";

                document.getElementById("stepPending").classList.add("active");
                document.getElementById("stepAccepted").classList.add("active");
                document.getElementById("stepDispatch").classList.add("active");
                document.getElementById("stepArrived").classList.add("active");

                document.getElementById("line1").classList.add("active");
                document.getElementById("line2").classList.add("active");
                document.getElementById("line3").classList.add("active");

                break;

            case "Completed":

                message = "✅ Treatment completed. Thank you for using LifeLine AI.";

                document.getElementById("stepPending").classList.add("active");
                document.getElementById("stepAccepted").classList.add("active");
                document.getElementById("stepDispatch").classList.add("active");
                document.getElementById("stepArrived").classList.add("active");
                document.getElementById("stepCompleted").classList.add("active");

                document.getElementById("line1").classList.add("active");
                document.getElementById("line2").classList.add("active");
                document.getElementById("line3").classList.add("active");
                document.getElementById("line4").classList.add("active");

                localStorage.removeItem("currentEmergency");

                break;

           case "Rejected":


    message = "❌ Emergency request rejected.";

    localStorage.removeItem("currentEmergency");

    break;

            default:

                message = data.status;

        }

        document.getElementById("liveStatus").innerHTML = message;

    });

}
