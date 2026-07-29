import {
updateDoc
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

export function setupButtons(emergencyRef){

// ==========================
// Driver confirms arrival
// ==========================

document.getElementById("arrivedBtn").onclick = async ()=>{

const ok = confirm("Have you reached the patient?");

if(!ok) return;

try{

await updateDoc(emergencyRef,{

status:"Arrived",

arrivedAt:new Date()

});

alert("✅ Arrival sent to patient.");

}
catch(error){

console.error(error);

alert(error.message);

}

};

// ==========================
// Return Driver Home
// ==========================

document.getElementById("returnBtn").onclick=()=>{

window.location.href="driver.html";

};

}