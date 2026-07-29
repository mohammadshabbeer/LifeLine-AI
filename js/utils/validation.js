export function validatePatient(patient){

    if(patient.name.trim()=="")
        return "Patient name required";

    if(patient.age.trim()=="")
        return "Age required";

    if(patient.phone.trim()=="")
        return "Phone required";

    if(patient.disease.trim()=="")
        return "Disease required";

    return "";

}