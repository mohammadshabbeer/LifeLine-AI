import { auth } from "../firebase/firebase-config.js";
import { signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const SESSION_KEY = "currentHospital";
const LOGIN_TIME_KEY = "hospitalLoginTime";

export const HOSPITALS = Object.freeze({
    "1111": {
        id: "hospital1",
        name: "Apollo Hospital",
        shortName: "Apollo",
        icon: "🏥"
    },
    "2222": {
        id: "hospital2",
        name: "Care Hospital",
        shortName: "Care",
        icon: "🏨"
    },
    "3333": {
        id: "hospital3",
        name: "Yashoda Hospital",
        shortName: "Yashoda",
        icon: "🏥"
    },
    "4444": {
        id: "hospital4",
        name: "City Hospital",
        shortName: "City",
        icon: "🏨"
    }
});

export function loginHospital(username, password) {
    const cleanUsername = String(username || "").trim().toLowerCase();
    const cleanPassword = String(password || "").trim();

    if (!cleanUsername) {
        return {
            success: false,
            message: "Please enter your username."
        };
    }

    if (!cleanPassword) {
        return {
            success: false,
            message: "Please enter your hospital password."
        };
    }

    let hospital = HOSPITALS[cleanPassword];

    if (!hospital) {
        const lowerPass = cleanPassword.toLowerCase();
        hospital = Object.values(HOSPITALS).find(h =>
            h.id.toLowerCase() === lowerPass ||
            h.shortName.toLowerCase() === lowerPass ||
            h.name.toLowerCase().includes(lowerPass)
        );
    }

    if (!hospital) {
        return {
            success: false,
            message: "Invalid hospital password. Demo PINs: Apollo (1111), Care (2222), Yashoda (3333), City (4444)."
        };
    }

    try {
        if (auth && auth.currentUser) {
            signOut(auth).catch(err => console.warn("Firebase auth signout on PIN login:", err));
        }
    } catch (_) {}

    localStorage.setItem(SESSION_KEY, JSON.stringify(hospital));
    localStorage.setItem(LOGIN_TIME_KEY, new Date().toISOString());

    const authSession = {
        uid: "demo-hospital-" + hospital.id,
        name: hospital.name,
        email: (hospital.shortName || hospital.name).toLowerCase().replace(/\s+/g, "") + "@lifeline.ai",
        role: "HOSPITAL",
        hospitalId: hospital.id,
        hospitalName: hospital.name,
        loginTime: new Date().toISOString(),
        lastActivity: Date.now()
    };

    sessionStorage.setItem("lifeline-auth-session", JSON.stringify(authSession));

    return {
        success: true,
        hospital
    };
}

export function getCurrentHospital() {
    const storedHospital = localStorage.getItem(SESSION_KEY);

    if (storedHospital) {
        try {
            const hospital = JSON.parse(storedHospital);

            if (hospital && hospital.id && hospital.name) {
                return hospital;
            }
        } catch (error) {
            console.error("Invalid hospital session:", error);
        }
    }

    try {
        const storedAuth = sessionStorage.getItem("lifeline-auth-session");
        if (storedAuth) {
            const authSession = JSON.parse(storedAuth);

            if (authSession && authSession.hospitalId && authSession.hospitalName) {
                const hospital = {
                    id: authSession.hospitalId,
                    name: authSession.hospitalName,
                    shortName: authSession.hospitalName.replace(" Hospital", ""),
                    icon: "🏥"
                };

                localStorage.setItem(SESSION_KEY, JSON.stringify(hospital));
                return hospital;
            } else if (authSession && (authSession.role === "HOSPITAL" || authSession.role === "ADMIN")) {
                const hospital = {
                    id: "hospital1",
                    name: "Apollo Hospital",
                    shortName: "Apollo",
                    icon: "🏥"
                };

                localStorage.setItem(SESSION_KEY, JSON.stringify(hospital));
                return hospital;
            }
        }
    } catch (fallbackError) {
        console.error("Error reading auth session fallback:", fallbackError);
    }

    return null;
}

export function requireHospitalLogin() {
    const hospital = getCurrentHospital();

    if (!hospital) {
        window.location.replace("hospital-login.html");
        return null;
    }

    return hospital;
}

export function clearHospitalSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LOGIN_TIME_KEY);
    sessionStorage.removeItem("lifeline-auth-session");
}

export function logoutHospital() {
    clearHospitalSession();
    window.location.replace("hospital-login.html");
}

export function normalizeHospitalName(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

export function isAlertForHospital(alertData, hospital) {
    if (!alertData || !hospital) {
        return false;
    }

    if (alertData.hospitalId && hospital.id && String(alertData.hospitalId).toLowerCase() === String(hospital.id).toLowerCase()) {
        return true;
    }

    const alertHospital = normalizeHospitalName(
        alertData.hospital || alertData.hospitalName || alertData.assignedHospital
    );

    const loggedHospital = normalizeHospitalName(hospital.name);

    if (alertHospital === loggedHospital) {
        return true;
    }

    const cleanAlert = alertHospital.replace(/\s*hospital\s*/gi, "").trim();
    const cleanLogged = loggedHospital.replace(/\s*hospital\s*/gi, "").trim();

    return cleanAlert !== "" && cleanAlert === cleanLogged;
}

