import { db } from "../firebase/firebase-config.js";

import {
collection,
query,
orderBy,
onSnapshot
}
from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const historyBody = document.getElementById("historyBody");

const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const typeFilter = document.getElementById("typeFilter");

const modal = document.getElementById("historyModal");
const modalBody = document.getElementById("modalBody");
const closeModal = document.getElementById("closeModal");

let allCases = [];

const q = query(
collection(db,"alerts"),
orderBy("timestamp","desc")
);

onSnapshot(q,(snapshot)=>{

allCases=[];

snapshot.forEach((doc)=>{

allCases.push({

id:doc.id,

...doc.data()

});

});

renderTable();

});

function renderTable(){

historyBody.innerHTML="";

const search = searchInput.value.toLowerCase();

const status = statusFilter.value;

const type = typeFilter.value;

const filtered = allCases.filter(item=>{

const patient=(item.patientName || "").toLowerCase();

const emergency=item.emergencyType || "";

return (

patient.includes(search)

&&

(status=="" || item.status===status)

&&

(type=="" || emergency===type)

);

});

filtered.forEach(item=>{

const tr=document.createElement("tr");
let date="-";

if(item.createdAt){

date=item.createdAt.toDate().toLocaleString();

}
else if(item.timestamp){

date=item.timestamp.toDate().toLocaleString();

}

tr.innerHTML=`

<td>

<div>

<b>${date.split(",")[0]}</b>

</div>

<div style="color:gray;font-size:13px;">

${date.split(",")[1] || ""}

</div>

</td>

<td>${item.patientName || "-"}</td>

<td>${item.emergencyType || "-"}</td>

<td>${item.hospital || "-"}</td>

<td>

<span class="status ${item.status}">

${item.status}

</span>

</td>

<td>

<button class="viewBtn"

data-id="${item.id}">

View

</button>

</td>

`;

historyBody.appendChild(tr);

});

document.querySelectorAll(".viewBtn").forEach(btn=>{

btn.onclick=()=>{

const item=allCases.find(x=>x.id===btn.dataset.id);

showDetails(item);

};

});

}

function showDetails(data){

modal.style.display="block";

let date="-";

if(data.timestamp){

date=data.timestamp.toDate().toLocaleString();

}

modalBody.innerHTML=`

<p><b>Patient :</b> ${data.patientName || "-"}</p>

<p><b>Phone :</b> ${data.phone || "-"}</p>

<p><b>Emergency :</b> ${data.emergencyType || "-"}</p>

<p><b>Symptoms :</b> ${data.symptoms || "-"}</p>

<p><b>Hospital :</b> ${data.hospital || "-"}</p>

<p><b>Status :</b> ${data.status || "-"}</p>

<p><b>Latitude :</b> ${data.latitude || "-"}</p>

<p><b>Longitude :</b> ${data.longitude || "-"}</p>

<p><b>Emergency Created :</b> ${
data.createdAt ?
data.createdAt.toDate().toLocaleString() : "-"
}</p>

<p><b>Accepted :</b> ${
data.acceptedAt ?
new Date(data.acceptedAt.seconds*1000).toLocaleString() : "-"
}</p>

<p><b>Dispatched :</b> ${
data.dispatchedAt ?
new Date(data.dispatchedAt.seconds*1000).toLocaleString() : "-"
}</p>

<p><b>Arrived :</b> ${
data.arrivedAt ?
new Date(data.arrivedAt.seconds*1000).toLocaleString() : "-"
}</p>

<p><b>Completed :</b> ${
data.completedAt ?
new Date(data.completedAt.seconds*1000).toLocaleString() : "-"
}</p>

`;

}

closeModal.onclick=()=>{

modal.style.display="none";

};

window.onclick=(e)=>{

if(e.target===modal){

modal.style.display="none";

}

};

searchInput.addEventListener("keyup",renderTable);
statusFilter.addEventListener("change",renderTable);
typeFilter.addEventListener("change",renderTable);