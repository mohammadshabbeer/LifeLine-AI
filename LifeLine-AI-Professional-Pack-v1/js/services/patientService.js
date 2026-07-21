import { db } from "../firebase/firebase-config.js";

import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    serverTimestamp,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const patientCollection = collection(db, "patients");

/* -----------------------------
   Add Patient
------------------------------ */

export async function addPatient(patient) {

    return await addDoc(patientCollection, {
        ...patient,
        createdAt: serverTimestamp()
    });

}

/* -----------------------------
   Realtime Patients
------------------------------ */

export function getPatients(callback) {

    const q = query(
        patientCollection,
        orderBy("createdAt", "desc")
    );

    return onSnapshot(q, (snapshot) => {

        const patients = [];

        snapshot.forEach((docSnap) => {

            patients.push({
                id: docSnap.id,
                ...docSnap.data()
            });

        });

        callback(patients);

    });

}

/* -----------------------------
   Update Patient
------------------------------ */

export async function updatePatient(id, patient) {

    const patientRef = doc(db, "patients", id);

    return await updateDoc(patientRef, patient);

}

/* -----------------------------
   Delete Patient
------------------------------ */

export async function deletePatient(id) {

    const patientRef = doc(db, "patients", id);

    return await deleteDoc(patientRef);

}
import { getDocs } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

export async function getAllPatients() {

    const snapshot = await getDocs(patientCollection);

    const patients = [];

    snapshot.forEach((doc) => {
        patients.push({
            id: doc.id,
            ...doc.data()
        });
    });

    return patients;
}