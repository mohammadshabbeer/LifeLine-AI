import {
updateDoc,
doc
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import { db } from "../../firebase/firebase-config.js";

export function setupButtons(emergencyRef){

document.getElementById("completeBtn").onclick = async ()=>{

const ok = confirm("Complete this emergency?");

if(!ok) return;

try{

// ===========================
// Complete Emergency
// ===========================

await updateDoc(emergencyRef,{

status:"Completed",

completedAt:new Date()

});

// ===========================
// Driver Available Again
// ===========================

await updateDoc(

doc(db,"drivers","driver1"),

{

status:"Available"

}

);

alert("✅ Emergency Completed Successfully");

window.location.href="hospital.html";

}
catch(error){

console.error(error);

alert("❌ "+error.message);

}

};

document.getElementById("returnBtn").onclick = ()=>{

window.location.href="hospital.html";

};

}
