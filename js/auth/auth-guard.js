import {
    auth,
    db
} from "../firebase/firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const LOGIN_PAGE = "login.html";

const SESSION_TIMEOUT =
    30 * 60 * 1000; // 30 minutes

function normalizeRole(role) {
    return String(role || "")
        .trim()
        .toUpperCase();
}

function redirectToLogin(
    message = "",
    requiredRole = ""
) {
    sessionStorage.removeItem(
        "lifeline-auth-session"
    );

    if (message) {
        sessionStorage.setItem(
            "lifeline-login-message",
            message
        );
    }

    const currentPage =
        window.location.pathname
            .split("/")
            .pop() || "";

    const parameters =
        new URLSearchParams();

    if (requiredRole) {
        parameters.set(
            "role",
            requiredRole
        );
    }

    if (currentPage) {
        parameters.set(
            "returnTo",
            currentPage
        );
    }

    const query =
        parameters.toString();

    const targetLoginPage = requiredRole === "HOSPITAL" ? "hospital-login.html" : LOGIN_PAGE;

    window.location.replace(
        query
            ? `${targetLoginPage}?${query}`
            : targetLoginPage
    );
}
async function loadUserProfile(uid) {
    const profileReference =
        doc(db, "users", uid);

    const profileSnapshot =
        await getDoc(profileReference);

    if (!profileSnapshot.exists()) {
        throw new Error(
            "User role profile not found."
        );
    }

    return {
        uid: profileSnapshot.id,
        ...profileSnapshot.data()
    };
}

function saveSession(profile, user) {
    const existingSession =
        JSON.parse(
            sessionStorage.getItem(
                "lifeline-auth-session"
            ) || "{}"
        );

    const session = {
        uid: user.uid,
        name:
            profile.name ||
            user.email ||
            "LifeLine User",

        email:
            profile.email ||
            user.email ||
            "",

        role:
            normalizeRole(profile.role),

        hospitalId:
            profile.hospitalId || null,

        hospitalName:
            profile.hospitalName || null,

        driverId:
            localStorage.getItem("currentDriver") || profile.driverId || profile.driverID || "driver1",

        loginTime:
            existingSession.loginTime ||
            new Date().toISOString(),

        lastActivity:
            Date.now()
    };

    sessionStorage.setItem(
        "lifeline-auth-session",
        JSON.stringify(session)
    );

    if (session.role === "HOSPITAL" || session.hospitalId) {
        const existingHospitalStr = localStorage.getItem("currentHospital");
        let existingHospital = null;
        try {
            if (existingHospitalStr) existingHospital = JSON.parse(existingHospitalStr);
        } catch (_) {}

        if (session.hospitalId && session.hospitalName) {
            const hospId = session.hospitalId;
            const hospName = session.hospitalName;
            localStorage.setItem(
                "currentHospital",
                JSON.stringify({
                    id: hospId,
                    name: hospName,
                    shortName: hospName.replace(" Hospital", ""),
                    icon: "🏥"
                })
            );
        } else if (!existingHospital || !existingHospital.id) {
            const hospId = "hospital1";
            const hospName = "Apollo Hospital";
            localStorage.setItem(
                "currentHospital",
                JSON.stringify({
                    id: hospId,
                    name: hospName,
                    shortName: hospName.replace(" Hospital", ""),
                    icon: "🏥"
                })
            );
        }
    }

    return session;
}

function getTabSession() {
    try {
        const stored = sessionStorage.getItem("lifeline-auth-session");
        if (stored) {
            return JSON.parse(stored);
        }

        const storedHospital = localStorage.getItem("currentHospital");
        if (storedHospital) {
            const hospital = JSON.parse(storedHospital);
            if (hospital && hospital.id && hospital.name) {
                const session = {
                    uid: "hospital-session-" + hospital.id,
                    name: hospital.name,
                    email: (hospital.shortName || "hospital").toLowerCase() + "@lifeline.ai",
                    role: "HOSPITAL",
                    hospitalId: hospital.id,
                    hospitalName: hospital.name,
                    loginTime: new Date().toISOString(),
                    lastActivity: Date.now()
                };
                sessionStorage.setItem("lifeline-auth-session", JSON.stringify(session));
                return session;
            }
        }

        return null;
    } catch {
        return null;
    }
}

function isRoleAllowed(role, normalizedAllowedRoles) {
    if (!normalizedAllowedRoles || normalizedAllowedRoles.length === 0) {
        return true;
    }
    const normalizedRole = normalizeRole(role);
    return normalizedAllowedRoles.includes(normalizedRole);
}

export function protectPage(
    allowedRoles = []
) {
    const normalizedAllowedRoles =
        allowedRoles.map(normalizeRole);

    document.documentElement.style.visibility =
        "hidden";

    onAuthStateChanged(
        auth,
        async (user) => {
            const tabSession = getTabSession();

            if (!user) {
                if (
                    tabSession &&
                    isRoleAllowed(
                        tabSession.role,
                        normalizedAllowedRoles
                    )
                ) {
                    startSessionTimeout(tabSession);

                    document.documentElement.style.visibility =
                        "visible";

                    window.dispatchEvent(
                        new CustomEvent(
                            "lifeline-auth-ready",
                            {
                                detail: tabSession
                            }
                        )
                    );

                    return;
                }

                redirectToLogin(
                    "Please sign in to continue.",
                    normalizedAllowedRoles[0] || ""
                );

                return;
            }

            try {
                const profile =
                    await loadUserProfile(user.uid);

                if (profile.active === false) {
                    redirectToLogin(
                        "Your account is inactive."
                    );

                    return;
                }

                const role =
                    normalizeRole(profile.role);

                if (
                    normalizedAllowedRoles.length > 0 &&
                    !normalizedAllowedRoles.includes(role)
                ) {
                    if (
                        tabSession &&
                        isRoleAllowed(
                            tabSession.role,
                            normalizedAllowedRoles
                        )
                    ) {
                        startSessionTimeout(tabSession);

                        document.documentElement.style.visibility =
                            "visible";

                        window.dispatchEvent(
                            new CustomEvent(
                                "lifeline-auth-ready",
                                {
                                    detail: tabSession
                                }
                            )
                        );

                        return;
                    }

                    redirectToLogin(
                        "Please sign in with an authorised account for this page.",
                        normalizedAllowedRoles[0] || ""
                    );

                    return;
                }

                const session =
                    saveSession(profile, user);

                startSessionTimeout(session);

                document.documentElement.style.visibility =
                    "visible";

                window.dispatchEvent(
                    new CustomEvent(
                        "lifeline-auth-ready",
                        {
                            detail: session
                        }
                    )
                );
            } catch (error) {
                console.error(
                    "Page protection failed:",
                    error
                );

                if (
                    tabSession &&
                    isRoleAllowed(
                        tabSession.role,
                        normalizedAllowedRoles
                    )
                ) {
                    startSessionTimeout(tabSession);

                    document.documentElement.style.visibility =
                        "visible";

                    window.dispatchEvent(
                        new CustomEvent(
                            "lifeline-auth-ready",
                            {
                                detail: tabSession
                            }
                        )
                    );

                    return;
                }

                redirectToLogin(
                    "Session validation failed."
                );
            }
        }
    );
}

function redirectUserByRole(role) {
    const destinations = {
        ADMIN: "dashboard.html",
        HOSPITAL: "hospital.html",
        DRIVER: "driver.html",
        PATIENT: "index.html"
    };

    window.location.replace(
        destinations[role] || LOGIN_PAGE
    );
}

function updateActivity() {
    const storedSession =
        sessionStorage.getItem(
            "lifeline-auth-session"
        );

    if (!storedSession) {
        return;
    }

    const session =
        JSON.parse(storedSession);

    session.lastActivity = Date.now();

    sessionStorage.setItem(
        "lifeline-auth-session",
        JSON.stringify(session)
    );
}

function startSessionTimeout(session) {
    const activityEvents = [
        "click",
        "keydown",
        "mousemove",
        "scroll",
        "touchstart"
    ];

    activityEvents.forEach((eventName) => {
        window.addEventListener(
            eventName,
            updateActivity,
            {
                passive: true
            }
        );
    });

    window.setInterval(
        async () => {
            const storedSession =
                sessionStorage.getItem(
                    "lifeline-auth-session"
                );

            if (!storedSession) {
                return;
            }

            const currentSession =
                JSON.parse(storedSession);

            const inactiveTime =
                Date.now() -
                Number(
                    currentSession.lastActivity ||
                    session.lastActivity ||
                    0
                );

            if (
                inactiveTime >= SESSION_TIMEOUT
            ) {
                await signOut(auth);

                redirectToLogin(
                    "Your session expired due to inactivity."
                );
            }
        },
        30000
    );
}

export async function logoutUser() {
    try {
        await signOut(auth);
    } finally {
        sessionStorage.removeItem(
            "lifeline-auth-session"
        );

        localStorage.removeItem(
            "currentHospital"
        );

        localStorage.removeItem(
            "currentDriver"
        );

        window.location.replace(LOGIN_PAGE);
    }
}