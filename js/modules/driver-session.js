const DEFAULT_DRIVER = "driver1";

export function getCurrentDriver() {
    return (
        localStorage.getItem("currentDriver") ||
        DEFAULT_DRIVER
    );
}

export function setCurrentDriver(driverId) {
    localStorage.setItem(
        "currentDriver",
        driverId
    );
}

export function clearCurrentDriver() {
    localStorage.removeItem("currentDriver");
}