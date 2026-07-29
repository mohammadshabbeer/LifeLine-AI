import {
    getCurrentHospital,
    loginHospital
} from "./hospital-session.js";

const existingSession = getCurrentHospital();

if (existingSession) {
    window.location.replace("hospital.html");
}

const form = document.getElementById("hospitalLoginForm");
const usernameInput = document.getElementById("hospitalUsername");
const passwordInput = document.getElementById("hospitalPassword");
const errorBox = document.getElementById("loginError");
const loginButton = document.getElementById("hospitalLoginButton");
const togglePasswordButton = document.getElementById("toggleHospitalPassword");

function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.add("show");
}

function clearError() {
    errorBox.textContent = "";
    errorBox.classList.remove("show");
}

togglePasswordButton.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";

    passwordInput.type = isPassword ? "text" : "password";
    togglePasswordButton.innerHTML = isPassword
        ? '<i class="fa-solid fa-eye-slash"></i>'
        : '<i class="fa-solid fa-eye"></i>';
});

form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearError();

    loginButton.disabled = true;
    loginButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing in...';

    const result = loginHospital(
        usernameInput.value,
        passwordInput.value
    );

    if (!result.success) {
        showError(result.message);
        loginButton.disabled = false;
        loginButton.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Login to Hospital';
        passwordInput.focus();
        passwordInput.select();
        return;
    }

    window.location.replace("hospital.html");
});
