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

    if (cleanUsername !== "admin") {
        return {
            success: false,
            message: "Invalid username. Use admin for the demo."
        };
    }

    const hospital = HOSPITALS[cleanPassword];

    if (!hospital) {
        return {
            success: false,
            message: "Invalid hospital password."
        };
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify(hospital));
    localStorage.setItem(LOGIN_TIME_KEY, new Date().toISOString());

    return {
        success: true,
        hospital
    };
}

export function getCurrentHospital() {
    const storedHospital = localStorage.getItem(SESSION_KEY);

    if (!storedHospital) {
        return null;
    }

    try {
        const hospital = JSON.parse(storedHospital);

        if (!hospital || !hospital.id || !hospital.name) {
            clearHospitalSession();
            return null;
        }

        return hospital;
    } catch (error) {
        console.error("Invalid hospital session:", error);
        clearHospitalSession();
        return null;
    }
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

    const alertHospital = normalizeHospitalName(
        alertData.hospital || alertData.hospitalName
    );

    const loggedHospital = normalizeHospitalName(hospital.name);

    return alertHospital === loggedHospital;
}
