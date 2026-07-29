import { db } from "../firebase/firebase-config.js";
import {
    requireHospitalLogin,
    isAlertForHospital
} from "./hospital-session.js";

import {
    collection,
    query,
    orderBy,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const currentHospital = requireHospitalLogin();
if (!currentHospital) throw new Error("Hospital login required.");

const historyBody = document.getElementById("historyBody");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const typeFilter = document.getElementById("typeFilter");
const modal = document.getElementById("historyModal");
const modalBody = document.getElementById("modalBody");
const closeModal = document.getElementById("closeModal");

let allCases = [];

const alertsQuery = query(
    collection(db, "alerts"),
    orderBy("timestamp", "desc")
);

onSnapshot(alertsQuery, (snapshot) => {
    allCases = snapshot.docs
        .map((documentSnapshot) => ({
            id: documentSnapshot.id,
            ...documentSnapshot.data()
        }))
        .filter((item) => isAlertForHospital(item, currentHospital));

    renderTable();
});

function renderTable() {
    historyBody.innerHTML = "";

    const search = searchInput.value.toLowerCase();
    const status = statusFilter.value;
    const type = typeFilter.value;

    const filtered = allCases.filter((item) => {
        const patient = (item.patientName || "").toLowerCase();
        const emergency = item.emergencyType || "";

        return patient.includes(search) &&
            (status === "" || item.status === status) &&
            (type === "" || emergency === type);
    });

    if (filtered.length === 0) {
        historyBody.innerHTML = `
            <tr><td colspan="6">No history found for ${currentHospital.name}.</td></tr>
        `;
        return;
    }

    filtered.forEach((item) => {
        const tr = document.createElement("tr");
        const date = getDateText(item.timestamp || item.createdAt);
        const dateParts = date.split(",");

        tr.innerHTML = `
            <td>
                <div><b>${dateParts[0] || "-"}</b></div>
                <div style="color:gray;font-size:13px;">${dateParts.slice(1).join(",")}</div>
            </td>
            <td>${item.patientName || "-"}</td>
            <td>${item.emergencyType || "-"}</td>
            <td>${item.hospital || currentHospital.name}</td>
            <td><span class="status ${item.status || "Pending"}">${item.status || "Pending"}</span></td>
            <td><button class="viewBtn" data-id="${item.id}">View</button></td>
        `;

        historyBody.appendChild(tr);
    });

    document.querySelectorAll(".viewBtn").forEach((button) => {
        button.onclick = () => {
            const item = allCases.find((entry) => entry.id === button.dataset.id);
            if (item) showDetails(item);
        };
    });
}

function getDateText(value) {
    if (!value) return "-";
    if (typeof value.toDate === "function") return value.toDate().toLocaleString();
    if (value.seconds) return new Date(value.seconds * 1000).toLocaleString();
    return new Date(value).toLocaleString();
}

function showDetails(data) {
    modal.style.display = "block";

    modalBody.innerHTML = `
        <p><b>Patient :</b> ${data.patientName || "-"}</p>
        <p><b>Phone :</b> ${data.phone || "-"}</p>
        <p><b>Emergency :</b> ${data.emergencyType || "-"}</p>
        <p><b>Symptoms :</b> ${data.symptoms || "-"}</p>
        <p><b>Hospital :</b> ${data.hospital || currentHospital.name}</p>
        <p><b>Status :</b> ${data.status || "-"}</p>
        <p><b>Latitude :</b> ${data.latitude || "-"}</p>
        <p><b>Longitude :</b> ${data.longitude || "-"}</p>
        <p><b>Emergency Created :</b> ${getDateText(data.timestamp || data.createdAt)}</p>
        <p><b>Accepted :</b> ${getDateText(data.acceptedAt)}</p>
        <p><b>Dispatched :</b> ${getDateText(data.dispatchedAt)}</p>
        <p><b>Arrived :</b> ${getDateText(data.arrivedAt)}</p>
        <p><b>Completed :</b> ${getDateText(data.completedAt)}</p>
    `;
}

closeModal.onclick = () => {
    modal.style.display = "none";
};

window.onclick = (event) => {
    if (event.target === modal) modal.style.display = "none";
};

searchInput.addEventListener("keyup", renderTable);
statusFilter.addEventListener("change", renderTable);
typeFilter.addEventListener("change", renderTable);
