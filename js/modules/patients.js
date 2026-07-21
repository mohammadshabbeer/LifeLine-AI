import {
    addPatient,
    getPatients,
    updatePatient,
    deletePatient
} from "../services/patientService.js";

import {
    validatePatient
} from "../utils/validation.js";

import {
    showSuccess,
    showError
} from "../utils/popup.js";

let editingId = null;

const patientName = document.getElementById("patientName");
const age = document.getElementById("age");
const gender = document.getElementById("gender");
const phone = document.getElementById("phone");
const address = document.getElementById("address");
const disease = document.getElementById("disease");
const doctor = document.getElementById("doctor");
const admissionDate = document.getElementById("admissionDate");

const saveBtn = document.getElementById("savePatient");

const table = document.getElementById("patientTable");

const search = document.getElementById("search");
saveBtn.addEventListener("click", async () => {

    const patient = {

        name: patientName.value,

        age: age.value,

        gender: gender.value,

        phone: phone.value,

        address: address.value,

        disease: disease.value,

        doctor: doctor.value,

        admissionDate: admissionDate.value

    };

    const error = validatePatient(patient);

    if (error) {

        showError(error);

        return;

    }

    try {

        if (editingId == null) {

            await addPatient(patient);

            showSuccess("Patient Registered");

        } else {

            await updatePatient(editingId, patient);

            showSuccess("Patient Updated");

            editingId = null;

            saveBtn.innerHTML = "Save Patient";

        }

        clearForm();

    }

    catch (err) {

        console.error(err);

        showError("Operation Failed");

    }

});
function clearForm(){

patientName.value="";

age.value="";

gender.selectedIndex=0;

phone.value="";

address.value="";

disease.value="";

doctor.value="";

admissionDate.value="";

}
function renderPatients(list){

table.innerHTML="";

list.forEach(patient=>{

table.innerHTML+=`

<tr>

<td>${patient.name}</td>

<td>${patient.age}</td>

<td>${patient.gender}</td>

<td>${patient.phone}</td>

<td>${patient.disease}</td>

<td>${patient.doctor}</td>

<td>

<button
class="edit"
data-id="${patient.id}">

Edit

</button>

<button
class="delete"
data-id="${patient.id}">

Delete

</button>

</td>

</tr>

`;

});

attachButtons(list);

}
function attachButtons(list){

document.querySelectorAll(".edit")

.forEach(btn=>{

btn.onclick=()=>{

const patient=

list.find(p=>p.id===btn.dataset.id);

editingId=patient.id;

patientName.value=patient.name;

age.value=patient.age;

gender.value=patient.gender;

phone.value=patient.phone;

address.value=patient.address;

disease.value=patient.disease;

doctor.value=patient.doctor;

admissionDate.value=patient.admissionDate;

saveBtn.innerHTML="Update Patient";

};

});

document.querySelectorAll(".delete")

.forEach(btn=>{

btn.onclick=async()=>{

if(confirm("Delete Patient?")){

await deletePatient(btn.dataset.id);

showSuccess("Patient Deleted");

}

};

});

}
let allPatients=[];

getPatients((patients)=>{

allPatients=patients;

renderPatients(allPatients);

});

search.addEventListener("keyup",()=>{

const keyword=

search.value.toLowerCase();

const filtered=

allPatients.filter(patient=>

patient.name.toLowerCase().includes(keyword) ||

patient.phone.includes(keyword) ||

patient.disease.toLowerCase().includes(keyword)

);

renderPatients(filtered);

});