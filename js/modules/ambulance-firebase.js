import {
updateDoc
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

export async function updateEmergencyStatus(ref,status){

await updateDoc(ref,{

status:status

});

}