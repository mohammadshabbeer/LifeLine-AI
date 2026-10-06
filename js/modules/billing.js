import { db } from "../firebase/firebase-config.js";

import {
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Collections
const patientCollection = collection(db, "patients");
const billCollection = collection(db, "bills");

// HTML Elements
const patientSelect = document.getElementById("patientSelect");
const doctor = document.getElementById("doctor");
const disease = document.getElementById("disease");

const consultation = document.getElementById("consultation");
const medicine = document.getElementById("medicine");
const room = document.getElementById("room");
const lab = document.getElementById("lab");
const other = document.getElementById("other");

const grandTotal = document.getElementById("grandTotal");
const paymentStatus = document.getElementById("paymentStatus");

const generateBill = document.getElementById("generateBill");
const clearBill = document.getElementById("clearBill");

const billTable = document.getElementById("billTable");

let patientList = [];

// Disease-wise Billing Templates

const diseaseCharges = {

    "Fever": {
        consultation: 500,
        medicine: 1200,
        room: 1000,
        lab: 500,
        other: 200
    },

    "Fracture": {
        consultation: 1000,
        medicine: 2500,
        room: 5000,
        lab: 1500,
        other: 500
    },

    "Heart Attack": {
        consultation: 3000,
        medicine: 10000,
        room: 15000,
        lab: 5000,
        other: 2000
    },

    "Diabetes": {
        consultation: 800,
        medicine: 2000,
        room: 3000,
        lab: 1000,
        other: 300
    },

    "COVID-19": {
        consultation: 1500,
        medicine: 5000,
        room: 8000,
        lab: 3000,
        other: 1000
    }

};

// ----------------------------
// Load Patients
// ----------------------------

async function loadPatients() {

    patientSelect.innerHTML =
        `<option value="">Select Patient</option>`;

    const snapshot = await getDocs(patientCollection);

    patientList = [];

    snapshot.forEach((docSnap) => {

        const patient = {
            id: docSnap.id,
            ...docSnap.data()
        };

        patientList.push(patient);

        patientSelect.innerHTML += `
            <option value="${patient.id}">
                ${patient.name}
            </option>
        `;

    });

}

loadPatients();

// ----------------------------
// Auto Fill
// ----------------------------

patientSelect.addEventListener("change", () => {

    const patient = patientList.find(
        p => p.id === patientSelect.value
    );

    if (!patient) return;

    doctor.value = patient.doctor || "";

    disease.value = patient.disease || "";

    const charges = diseaseCharges[patient.disease];

    if (charges) {

        consultation.value = charges.consultation;

        medicine.value = charges.medicine;

        room.value = charges.room;

        lab.value = charges.lab;

        other.value = charges.other;

    } else {

        consultation.value = "";

        medicine.value = "";

        room.value = "";

        lab.value = "";

        other.value = "";

    }

    calculateTotal();

});

// ----------------------------
// Grand Total
// ----------------------------

function calculateTotal() {

    const total =

        Number(consultation.value || 0) +

        Number(medicine.value || 0) +

        Number(room.value || 0) +

        Number(lab.value || 0) +

        Number(other.value || 0);

    grandTotal.value = total;

}

consultation.oninput = calculateTotal;
medicine.oninput = calculateTotal;
room.oninput = calculateTotal;
lab.oninput = calculateTotal;
other.oninput = calculateTotal;

// ----------------------------
// Save Bill
// ----------------------------

generateBill.addEventListener("click", async () => {

    if (patientSelect.value === "") {

        alert("Select Patient");

        return;

    }

    await addDoc(billCollection, {

        patientId: patientSelect.value,

        patientName:
            patientSelect.options[
                patientSelect.selectedIndex
            ].text,

        doctor: doctor.value,

        disease: disease.value,

        consultationCharges:
            Number(consultation.value || 0),

        medicineCharges:
            Number(medicine.value || 0),

        roomCharges:
            Number(room.value || 0),

        labCharges:
            Number(lab.value || 0),

        otherCharges:
            Number(other.value || 0),

        grandTotal:
            Number(grandTotal.value || 0),

        paymentStatus:
            paymentStatus.value,

        createdAt:
            serverTimestamp()

    });

    alert("Bill Generated Successfully");

    clearForm();

});

// ----------------------------
// Clear Form
// ----------------------------

function clearForm() {

    patientSelect.selectedIndex = 0;

    doctor.value = "";

    disease.value = "";

    consultation.value = "";

    medicine.value = "";

    room.value = "";

    lab.value = "";

    other.value = "";

    grandTotal.value = "";

    paymentStatus.value = "Unpaid";

}

clearBill.addEventListener("click", clearForm);

// ----------------------------
// Realtime Bills
// ----------------------------

const q = query(
    billCollection,
    orderBy("createdAt", "desc")
);

onSnapshot(q, (snapshot) => {

    billTable.innerHTML = "";

    snapshot.forEach((docSnap) => {

        const bill = docSnap.data();

        billTable.innerHTML += `

<tr>

<td>${bill.patientName}</td>

<td>₹ ${bill.grandTotal}</td>

<td>${bill.paymentStatus}</td>

<td>

<button
class="deleteBill"
data-id="${docSnap.id}">

Delete

</button>

</td>

</tr>

`;

    });

    document.querySelectorAll(".deleteBill")
        .forEach(button => {

            button.onclick = async () => {

                if (!confirm("Delete Bill?"))
                    return;

                await deleteDoc(
                    doc(
                        db,
                        "bills",
                        button.dataset.id
                    )
                );

            };

        });

});