export function updatePatientInfo(emergency){

document.getElementById("patientName").innerHTML =
`<b>Name :</b> ${emergency.patientName}`;

document.getElementById("patientEmergency").innerHTML =
`<b>Emergency :</b> ${emergency.emergencyType}`;

document.getElementById("patientHospital").innerHTML =
`<b>Hospital :</b> ${emergency.hospital}`;

}

export function updateDriverInfo(driver){

document.getElementById("driverName").textContent =
driver.name;

document.getElementById("driverPhone").textContent =
driver.phone;

document.getElementById("driverVehicle").textContent =
driver.ambulanceNo;

document.getElementById("driverLicense").textContent =
driver.license;

document.getElementById("driverExperience").textContent =
driver.experience;

const status=document.getElementById("driverStatus");

status.textContent=driver.status;

status.className="statusBadge";

switch(driver.status){

case "Available":

status.style.background="#22c55e";

break;

case "On Duty":

status.style.background="#f59e0b";

break;

case "Emergency":

status.style.background="#dc2626";

break;

default:

status.style.background="#6b7280";

}

}