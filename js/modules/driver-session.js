const SESSION_KEY = "lifeline-auth-session";
const SELECTED_DRIVER_KEY = "currentDriver";

function readAuthSession() {
    try {
        return JSON.parse(
            sessionStorage.getItem(SESSION_KEY) || "{}"
        );
    } catch (error) {
        console.error(
            "Unable to read authentication session:",
            error
        );

        return {};
    }
}

export function getCurrentDriver() {
    const selected = localStorage.getItem(SELECTED_DRIVER_KEY);

    if (selected && ["driver1", "driver2", "driver3"].includes(selected.trim())) {
        return selected.trim();
    }

    const session = readAuthSession();

    if (session.driverId && String(session.driverId).trim()) {
        const id = String(session.driverId).trim();
        localStorage.setItem(SELECTED_DRIVER_KEY, id);
        return id;
    }

    return "driver1";
}

export function setCurrentDriver(driverId) {
    const allowedDrivers = [
        "driver1",
        "driver2",
        "driver3"
    ];

    if (!allowedDrivers.includes(driverId)) {
        console.error(
            "Invalid driver ID:",
            driverId
        );

        return false;
    }

    localStorage.setItem(
        SELECTED_DRIVER_KEY,
        driverId
    );

    try {
        const sessionStr = sessionStorage.getItem(SESSION_KEY);
        if (sessionStr) {
            const session = JSON.parse(sessionStr);
            session.driverId = driverId;
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        }
    } catch (_) {}

    return true;
}

export function getDriverAuthSession() {
    return readAuthSession();
}