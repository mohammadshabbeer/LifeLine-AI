import { askGemini } from "./gemini.js";

const chatMessages = document.getElementById("hospitalChatMessages");
const input = document.getElementById("hospitalChatInput");
const sendBtn = document.getElementById("hospitalSendBtn");

const openBtn = document.getElementById("openAssistant");
const closeBtn = document.getElementById("closeAssistant");
const assistant = document.getElementById("hospitalAssistant");

if (openBtn && assistant) {
    openBtn.addEventListener("click", () => {
        assistant.classList.add("show");
    });
}

if (closeBtn && assistant) {
    closeBtn.addEventListener("click", () => {
        assistant.classList.remove("show");
    });
}

function addMessage(text, type) {

    const div = document.createElement("div");
    div.className = type;
    div.innerHTML = text.replace(/\n/g,"<br>");

    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage(){

const message=input.value.trim();

if(message=="") return;

addMessage(message,"user");

input.value="";

const cmd=message.toLowerCase();

if(cmd.includes("dashboard")){

window.location.href="dashboard.html";

return;

}

if(cmd.includes("patient")){

window.location.href="patients.html";

return;

}

if(cmd.includes("billing")){

window.location.href="billing.html";

return;

}

if(cmd.includes("history")){

window.location.href="history.html";

return;

}

if(cmd.includes("ambulance")){

window.location.href="ambulance-map.html";

return;

}

if(cmd.includes("hospital")){

window.location.href="hospital.html";

return;

}

addMessage("🤖 Thinking...","bot");

const prompt=`

You are LifeLine AI Hospital Assistant.

You ONLY answer questions related to the LifeLine Emergency Response & Hospital ERP System.

Modules available

Dashboard

Patients

Billing

Hospital

Ambulance Tracking

History

AI Emergency Chatbot

Emergency Requests

If user asks how to perform something, explain according to this website.

Examples

How to add patient

→ Open Patients page.
→ Fill patient details.
→ Click Save Patient.

How to dispatch ambulance

→ Open Hospital Dashboard.
→ Click Dispatch.

How to generate bill

→ Open Billing.
→ Select Patient.
→ Review Charges.
→ Click Generate Bill.

If user asks unrelated questions politely say

"I can help only with the LifeLine Hospital ERP System."

Keep answers below 120 words.

User Question:

${message}

`;

const reply=await askGemini(prompt);

chatMessages.lastChild.remove();

addMessage(reply,"bot");

}
sendBtn.addEventListener("click",sendMessage);

input.addEventListener("keypress",(e)=>{

if(e.key==="Enter"){

sendMessage();

}

});