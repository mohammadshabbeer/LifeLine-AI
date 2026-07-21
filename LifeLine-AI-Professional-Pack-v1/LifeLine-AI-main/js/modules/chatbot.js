import { askGemini } from "../../ai/gemini.js";

import { db } from "../firebase/firebase-config.js";

import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// ==========================
// Elements
// ==========================

const chatbotBtn = document.getElementById("chatbotBtn");
const chatbot = document.getElementById("chatbot");
const closeChat = document.getElementById("closeChat");

const sendBtn = document.getElementById("sendBtn");
const userInput = document.getElementById("userInput");
const chatMessages = document.getElementById("chatMessages");

const emergencyAction = document.getElementById("emergencyAction");
const sendEmergencyBtn = document.getElementById("sendEmergencyBtn");

let lastSymptoms = "";
let lastSeverity = "Low";

// ==========================
// Open Chat
// ==========================

chatbotBtn.addEventListener("click", () => {
    chatbot.classList.add("show");
});

// ==========================
// Close Chat
// ==========================

closeChat.addEventListener("click", () => {
    chatbot.classList.remove("show");
});

// ==========================
// Add Message
// ==========================

function addMessage(message, type){

    const div=document.createElement("div");

    div.className=type;

    div.innerHTML=message.replace(/\n/g,"<br>");

    chatMessages.appendChild(div);

    chatMessages.scrollTop=chatMessages.scrollHeight;

}

// ==========================
// Send Message
// ==========================

async function sendMessage(){

    const text=userInput.value.trim();

    if(text==="") return;

    lastSymptoms=text;

    addMessage(text,"user");

    userInput.value="";

    addMessage("🤖 Thinking...","bot");

    const reply=await askGemini(text);

    const bots=document.querySelectorAll(".bot");

    bots[bots.length-1].innerHTML=reply.replace(/\n/g,"<br>");

    const lower=reply.toLowerCase();

    if(lower.includes("critical")){

        lastSeverity="Critical";

    }
    else if(lower.includes("high")){

        lastSeverity="High";

    }
    else if(lower.includes("medium")){

        lastSeverity="Medium";

    }
    else{

        lastSeverity="Low";

    }

    if(emergencyAction){

        if(
            lower.includes("high") ||
            lower.includes("critical")
        ){

            emergencyAction.style.display="block";

        }
        else{

            emergencyAction.style.display="none";

        }

    }

}

// ==========================
// Events
// ==========================

sendBtn.addEventListener("click",sendMessage);

userInput.addEventListener("keypress",(e)=>{

    if(e.key==="Enter"){

        sendMessage();

    }

});

// ==========================
// Send Emergency
// ==========================

if(sendEmergencyBtn){

sendEmergencyBtn.addEventListener("click",async()=>{

try{

const docRef=await addDoc(collection(db,"alerts"),{

patientName:"Unknown",

phone:"",

emergencyType:lastSeverity,

symptoms:lastSymptoms,

hospital:"City Hospital",

latitude:17.3850,

longitude:78.4867,

location:"",

status:"Pending",

timestamp:serverTimestamp()

});

localStorage.setItem("currentEmergency",docRef.id);

alert("🚑 Emergency Sent Successfully");

emergencyAction.style.display="none";

}
catch(error){

console.error(error);

alert("Failed to send emergency.");

}

});

}