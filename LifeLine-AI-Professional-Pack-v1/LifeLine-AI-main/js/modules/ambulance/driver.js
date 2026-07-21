import {
collection,
getDocs
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import { db } from "../firebase/firebase-config.js";

export async function getDriver(){

const snap=await getDocs(collection(db,"drivers"));

if(snap.empty){

alert("No Driver Found");

return null;

}

return snap.docs[0].data();

}