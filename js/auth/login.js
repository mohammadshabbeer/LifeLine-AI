import {

auth

} from "../firebase/firebase-config.js";

import {

signInWithEmailAndPassword

} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const form=document.getElementById("loginForm");

form.addEventListener("submit",

async(e)=>{

e.preventDefault();

const email=document.getElementById("email").value;

const password=document.getElementById("password").value;

try{

await signInWithEmailAndPassword(

auth,

email,

password

);

alert("Login Successful");

window.location="dashboard.html";

}

catch(error){

alert(error.message);

}

});