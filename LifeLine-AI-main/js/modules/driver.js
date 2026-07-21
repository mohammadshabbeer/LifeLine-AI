import { db } from "../firebase/firebase-config.js";

import {
collection,
query,
orderBy,
onSnapshot,
doc,
updateDoc,
getDoc
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const container = document.getElementById("driverEmergencyContainer");

const alarm = document.getElementById("driverAlarm");
document.addEventListener("click",()=>{

    alarm.play()
    .then(()=>{

        alarm.pause();
        alarm.currentTime=0;

    })
    .catch(()=>{});

},{once:true});
let firstLoad = true;

// =======================
// Clock
// =======================

function updateClock(){

document.getElementById("clock").textContent =
new Date().toLocaleTimeString();

}

setInterval(updateClock,1000);

updateClock();


// =======================
// Listen Firestore
// =======================

const q = query(

collection(db,"alerts"),

orderBy("timestamp","desc")

);

onSnapshot(q,(snapshot)=>{

if(!firstLoad){

snapshot.docChanges().forEach(change=>{

    const data = change.doc.data();

    if(

        data.driverAssigned===true &&
        data.assignedDriver==="driver1" &&
        data.driverStatus==="Waiting"

    ){

        alarm.currentTime = 0;

        alarm.play().catch(()=>{});

    }

});

firstLoad = false;

container.innerHTML="";

let found=false;

snapshot.forEach(doc=>{

  if(
doc.data().assignedDriver &&
doc.data().assignedDriver!=="driver1"
){

return;

}
  
const data=doc.data();

if (

    data.driverAssigned &&
    data.assignedDriver === "driver1" &&
    data.driverStatus === "Waiting"

){found=true;

container.innerHTML+=`

<div class="driver-card">

<h2>🚨 New Emergency</h2>

<p><b>Patient :</b> ${data.patientName}</p>

<p><b>Phone :</b> ${data.phone}</p>

<p><b>Emergency :</b> ${data.emergencyType}</p>

<p><b>Symptoms :</b> ${data.symptoms}</p>

<p><b>Hospital :</b> ${data.hospital}</p>

<p><b>Location :</b> ${data.location}</p>

<div class="driver-actions">

<button
class="acceptBtn"
onclick="acceptEmergency('${doc.id}')">

✅ Accept

</button>

<button
class="rejectBtn"
onclick="rejectEmergency('${doc.id}')">

❌ Reject

</button>

<button
class="callBtn"
onclick="window.location.href='tel:${data.phone}'">

📞 Call

</button>

${data.driverStatus==="Accepted" ? `
<button
class="mapBtn"
onclick="window.location.href='ambulance-map.html?id=${doc.id}'">

📍 Start Navigation

</button>
` : ""}

</div>

</div>

`;

}

});

if(!found){

container.innerHTML=`

<h2 style="text-align:center;color:#777;">

🚑 Waiting for Emergency...

</h2>

`;

}

});
// ==========================
// Driver Accept
// ==========================
let driverData={};

async function loadDriver(){

const snap=await getDoc(doc(db,"drivers","driver1"));

if(snap.exists()){

driverData=snap.data();
document.querySelector(".available").textContent =

driverData.status;

if(driverData.status==="Busy"){

document.querySelector(".available").className="busy";

}
}

}

loadDriver();
window.acceptEmergency = async (id)=>{

try{

await updateDoc(doc(db,"alerts",id),{

    driverStatus:"Accepted",

    status:"Driver Accepted",

    driverName:driverData.driverName,

    driverVehicle:driverData.vehicle,

    driverResponseTime:new Date(),

    driverId:"driver1"

});

alarm.pause();
alarm.currentTime = 0;
alert("✅ Emergency Accepted");

}

catch(error){

console.error(error);

alert(error.message);

}

};


// ==========================
// Driver Reject
// ==========================

// ==========================
// Driver Reject
// ==========================

window.rejectEmergency = async(id)=>{

const reason = prompt("Reason for rejection?");

if(!reason) return;

try{

await updateDoc(doc(db,"alerts",id),{

status:"Driver Rejected",

driverStatus:"Rejected",

driverRejectReason:reason

});

alarm.pause();
alarm.currentTime = 0;
alert("Emergency Rejected");

}
catch(error){

console.error(error);

alert(error.message);

}

};
