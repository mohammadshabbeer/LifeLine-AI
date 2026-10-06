export function loadPatient(emergency){

document.getElementById("patientName").innerHTML=
`<b>Name :</b> ${emergency.patientName}`;

document.getElementById("patientEmergency").innerHTML=
`<b>Emergency :</b> ${emergency.emergencyType}`;

document.getElementById("patientHospital").innerHTML=
`<b>Hospital :</b> ${emergency.hospital}`;

}

export function loadDriver(driver){

document.getElementById("driverName").innerHTML=
driver.name;

document.getElementById("driverPhone").innerHTML=
driver.phone;

document.getElementById("driverVehicle").innerHTML=
driver.ambulanceNo;

document.getElementById("driverLicense").innerHTML=
driver.license;

document.getElementById("driverExperience").innerHTML=
driver.experience;

document.getElementById("driverStatus").innerHTML=
driver.status;

}