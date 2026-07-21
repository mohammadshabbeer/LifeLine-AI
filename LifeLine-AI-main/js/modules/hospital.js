import { db } from "../firebase/firebase-config.js";

import {
collection,
onSnapshot,
doc,
updateDoc,
deleteDoc,
query,
orderBy,
getDoc
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const container=document.getElementById("emergencyContainer");
const counter=document.getElementById("activeCount");
const alarm=document.getElementById("alarmAudio");
if(!alarm){

console.error("Hospital alarm not found.");

}
const soundBtn=document.getElementById("soundBtn");
// Unlock audio on mobile browsers
let alertedEmergencies = new Set();
let audioUnlocked = false;

function unlockAudio() {

    if (audioUnlocked) return;

    alarm.play()
        .then(() => {
            alarm.pause();
            alarm.currentTime = 0;
            audioUnlocked = true;
            console.log("✅ Audio unlocked");
        })
        .catch(() => {});

}

document.addEventListener("click", unlockAudio, { once: true });
document.addEventListener("touchstart", unlockAudio, { once: true });
let soundEnabled=true;
let firstLoad=true;

// =======================
// Clock
// =======================

function updateClock(){

document.getElementById("clock").textContent=
new Date().toLocaleTimeString();

}

setInterval(updateClock,1000);
updateClock();

// =======================
// Toolbar
// =======================

document.getElementById("latestBtn").onclick=()=>{

window.location.href="hospital.html";

};

document.getElementById("historyBtn").onclick=()=>{

window.location.href="history.html";

};

// =======================
// Alarm Toggle
// =======================

soundBtn.onclick=()=>{

soundEnabled=!soundEnabled;

soundBtn.innerHTML=soundEnabled?
"🔊 Alarm ON":
"🔇 Alarm OFF";

if(!soundEnabled){

alarm.pause();

}

};

// =======================
// Firestore Listener
// =======================

const q=query(
collection(db,"alerts"),
orderBy("timestamp","desc")
);

onSnapshot(q, (snapshot) => {

    // Play alarm for newly added emergencies
    if (!firstLoad) {

       snapshot.docChanges().forEach(change => {

    const data = change.doc.data();
    const id = change.doc.id;

if (

    (
        data.status === "Pending" ||

        data.driverStatus === "Accepted" ||

        data.driverStatus === "Rejected"
    ) &&

    soundEnabled &&
    !alertedEmergencies.has(id)

) {

    alertedEmergencies.add(id);

    alarm.currentTime = 0;

    alarm.play().catch(console.error);

}

});

    }

    firstLoad = false;

    container.innerHTML = "";

    let active = 0;

    snapshot.forEach((docSnap) => {

        const data = docSnap.data();

        if (
            data.status !== "Completed" &&
            data.status !== "Rejected"
        ) {
            active++;
        }

        container.innerHTML += `
<div class="emergency-card">

<h3>🚨 ${data.emergencyType}</h3>

<p><b>Patient :</b> ${data.patientName}</p>

<p><b>Phone :</b> ${data.phone}</p>

<p><b>Symptoms :</b> ${data.symptoms}</p>

<p><b>Hospital :</b> ${data.hospital}</p>

<p>
<b>📅 Received :</b><br>
${
data.timestamp
?
data.timestamp.toDate().toLocaleDateString()
+" "+
data.timestamp.toDate().toLocaleTimeString()
:
"Processing..."
}
</p>

<p>
<b>Status :</b>

<span style="color:red">

${data.status}

</span>

</p>

${
data.driverStatus ?

`

<div class="driverInfo">

<h4>

🚑 Driver Response

</h4>

<p>

<b>Status :</b>

${data.driverStatus}

</p>

<p>

<b>Driver :</b>

${data.driverName || "Not Assigned"}

</p>

<p>

<b>Vehicle :</b>

${data.driverVehicle || "-"}

</p>

${
data.driverRejectReason ?

`

<p style="color:red;">

<b>Reason :</b>

${data.driverRejectReason}

</p>

`

:

""

}

</div>

`

:

""

}

<div class="actions">

<button class="accept"
onclick="acceptCase('${docSnap.id}')">
Accept
</button>

<button class="reject"
onclick="rejectCase('${docSnap.id}')">
Reject
</button>

<button
class="assign"
onclick="assignDriver('${docSnap.id}')">

🚑 Assign Driver

</button>

<button class="dispatch"
onclick="dispatchCase('${docSnap.id}')">
Dispatch
</button>

<button class="complete"
onclick="completeCase('${docSnap.id}')">
Completed
</button>

<button class="delete"
onclick="deleteCase('${docSnap.id}')">
🗑 Remove
</button>

</div>

</div>
`;

    });

    counter.textContent = active;

});

// =======================
// Accept
// =======================

window.acceptCase=async(id)=>{

await updateDoc(doc(db,"alerts",id),{

status:"Accepted",

acceptedAt:new Date()

});

alarm.pause();

};

// =======================
// Dispatch
// =======================

window.dispatchCase = async(id)=>{

const driver = prompt(
"Enter Driver ID\n\nExample:\ndriver1"
);

if(!driver) return;

try{

const snap = await getDoc(doc(db,"alerts",id));

const data = snap.data();

if(data.driverStatus!=="Accepted"){

alert("Driver has not accepted the request yet.");

return;

}

await updateDoc(

doc(db,"alerts",id),

{

status:"Dispatched",

dispatchedAt:new Date()

}

);

alert("✅ Emergency sent to "+driver);

alarm.pause();

}
catch(error){

console.error(error);

alert(error.message);

}

};

// =======================
// Complete
// =======================

window.completeCase=async(id)=>{

await updateDoc(

doc(db,"alerts",id),

{

status:"Completed"

}

);

alarm.pause();

};

// =======================
// Reject
// =======================

window.rejectCase=async(id)=>{

const reason=prompt("Reason for rejection");

if(!reason) return;

await updateDoc(

doc(db,"alerts",id),

{

status:"Rejected",

rejectionReason:reason

}

);

alarm.pause();

};

// =======================
// Delete
// =======================

window.deleteCase=async(id)=>{

const ok=confirm("Are you sure you want to delete this emergency permanently?");

if(!ok) return;

try{

await deleteDoc(doc(db,"alerts",id));

alert("✅ Emergency Deleted Successfully");

}
catch(error){

console.error(error);

alert("❌ "+error.message);

}

};
window.assignDriver = async (id) => {

    console.log("Assign Driver Clicked");
    console.log("Emergency ID:", id);

    const driver = prompt("Enter Driver ID");

    if (!driver) return;

    try {

        await updateDoc(doc(db, "alerts", id), {

            assignedDriver: driver,

            driverAssigned: true,

            driverAssignedTime: new Date(),

            driverStatus: "Waiting"

        });

        console.log("Firestore Updated Successfully");

        alert("Driver Assigned Successfully");

    }
    catch (error) {

        console.error(error);

        alert(error.message);

    }

};
