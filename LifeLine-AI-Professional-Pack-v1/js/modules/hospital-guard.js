import { requireHospitalLogin } from "./hospital-session.js";

// Protect hospital ERP pages from direct access.
requireHospitalLogin();
