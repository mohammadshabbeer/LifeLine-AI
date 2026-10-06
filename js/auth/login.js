import {
    auth,
    db
} from "../firebase/firebase-config.js";

import {
    browserLocalPersistence,
    browserSessionPersistence,
    onAuthStateChanged,
    setPersistence,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
    addDoc,
    collection,
    doc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const ROLE_REDIRECTS = Object.freeze({
    ADMIN: "dashboard.html",
    HOSPITAL: "hospital.html",
    DRIVER: "driver.html",
    PATIENT: "index.html"
});
const ROLE_DEMO_EMAILS =
    Object.freeze({
        ADMIN:
            "admin@lifeline.ai",

        HOSPITAL:
            "apollo@lifeline.ai",

        DRIVER:
            "driver1@lifeline.ai",

        PATIENT:
            "patient@lifeline.ai"
    });

const ROLE_LABELS =
    Object.freeze({
        ADMIN:
            "Administrator",

        HOSPITAL:
            "Hospital Staff",

        DRIVER:
            "Ambulance Driver",

        PATIENT:
            "Patient"
    });

const form =
    document.getElementById("loginForm");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const rememberMeInput =
    document.getElementById("rememberMe");

const loginButton =
    document.getElementById("loginButton");

const messageBox =
    document.getElementById("loginMessage");

const togglePasswordButton =
    document.getElementById("togglePassword");

let loginInProgress = false;

function showMessage(message, type = "error") {
    messageBox.textContent = message;
    messageBox.className =
        `login-message show ${type}`;
}

function clearMessage() {
    messageBox.textContent = "";
    messageBox.className = "login-message";
}

function setLoading(isLoading) {
    loginButton.disabled = isLoading;

    loginButton.innerHTML = isLoading
        ? `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Verifying Account...
        `
        : `
            <i class="fa-solid fa-right-to-bracket"></i>
            Sign In
        `;
}

function normaliseRole(role) {
    return String(role || "")
        .trim()
        .toUpperCase();
}

function getFriendlyError(error) {
    const errorCode = error?.code || "";

    const messages = {
        "auth/invalid-credential":
            "Invalid email or password.",

        "auth/user-not-found":
            "No account was found with this email.",

        "auth/wrong-password":
            "Invalid email or password.",

        "auth/invalid-email":
            "Enter a valid email address.",

        "auth/user-disabled":
            "This account has been disabled.",

        "auth/too-many-requests":
            "Too many failed attempts. Please try again later.",

        "auth/network-request-failed":
            "Network error. Check your internet connection."
    };

    return (
        messages[errorCode] ||
        error?.message ||
        "Unable to sign in. Please try again."
    );
}

async function getUserProfile(uid) {
    const profileReference =
        doc(db, "users", uid);

    const profileSnapshot =
        await getDoc(profileReference);

    if (!profileSnapshot.exists()) {
        throw new Error(
            "Your account has no LifeLine AI role profile."
        );
    }

    return {
        uid: profileSnapshot.id,
        ...profileSnapshot.data()
    };
}

async function recordLoginAudit({
    uid,
    email,
    role,
    success,
    message
}) {
    try {
        await addDoc(
            collection(db, "loginAudit"),
            {
                uid: uid || null,
                email: email || null,
                role: role || null,
                success: Boolean(success),
                message: message || "",
                userAgent:
                    navigator.userAgent,
                createdAt:
                    serverTimestamp()
            }
        );
    } catch (auditError) {
        console.warn(
            "Login audit could not be stored:",
            auditError
        );
    }
}

function saveAppSession(profile) {
    const session = {
        uid: profile.uid,
        name:
            profile.name ||
            profile.email ||
            "LifeLine User",

        email:
            profile.email || "",

        role:
            normaliseRole(profile.role),

        hospitalId:
            profile.hospitalId || null,

        hospitalName:
            profile.hospitalName || null,

        driverId:
            profile.driverId || profile.driverID || null,

        loginTime:
            new Date().toISOString(),

        lastActivity:
            Date.now()
    };

    sessionStorage.setItem(
        "lifeline-auth-session",
        JSON.stringify(session)
    );

    if (session.hospitalId || session.role === "HOSPITAL") {
        const hospId = session.hospitalId || "hospital1";
        const hospName = session.hospitalName || "Apollo Hospital";
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

    if (session.driverId) {
        localStorage.setItem(
            "currentDriver",
            session.driverId
        );
    }
}

async function redirectAuthenticatedUser(user) {
    const profile =
        await getUserProfile(user.uid);

    const role =
        normaliseRole(profile.role);

    if (profile.active === false) {
        throw new Error(
            "Your LifeLine AI account is inactive."
        );
    }

    const destination =
        ROLE_REDIRECTS[role];

    if (!destination) {
        throw new Error(
            "Your account has an invalid role."
        );
    }

    saveAppSession({
        ...profile,
        uid: user.uid,
        email:
            profile.email ||
            user.email
    });

    await recordLoginAudit({
        uid: user.uid,
        email: user.email,
        role,
        success: true,
        message: "Login successful"
    });

    showMessage(
        `Login successful. Opening ${role.toLowerCase()} portal...`,
        "success"
    );

  const requestedRole =
    getRequestedRole();

const returnPage =
    getReturnPage();

if (requestedRole && requestedRole !== role) {
    setLoading(false);
    return;
}

const finalDestination =
    returnPage || destination;

window.setTimeout(() => {
    window.location.replace(
        finalDestination
    );
}, 500);
}

togglePasswordButton.addEventListener(
    "click",
    () => {
        const passwordHidden =
            passwordInput.type === "password";

        passwordInput.type =
            passwordHidden
                ? "text"
                : "password";

        togglePasswordButton.innerHTML =
            passwordHidden
                ? '<i class="fa-solid fa-eye-slash"></i>'
                : '<i class="fa-solid fa-eye"></i>';

        togglePasswordButton.setAttribute(
            "aria-label",
            passwordHidden
                ? "Hide password"
                : "Show password"
        );
    }
);
function getRequestedRole() {
    const parameters =
        new URLSearchParams(
            window.location.search
        );

    return normaliseRole(
        parameters.get("role")
    );
}

function getReturnPage() {
    const parameters =
        new URLSearchParams(
            window.location.search
        );

    const returnTo =
        parameters.get("returnTo") || "";

    // Prevent external or unsafe redirects.
    if (
        !returnTo ||
        returnTo.includes("://") ||
        returnTo.includes("..") ||
        returnTo.includes("/") ||
        !returnTo.endsWith(".html")
    ) {
        return "";
    }

    return returnTo;
}

function initializeRoleLogin() {
    const requestedRole =
        getRequestedRole();

    const rememberedEmails =
        JSON.parse(
            localStorage.getItem(
                "lifeline-remembered-emails"
            ) || "{}"
        );

    const roleEmail =
        rememberedEmails[requestedRole] ||
        ROLE_DEMO_EMAILS[requestedRole] ||
        "";

    if (roleEmail) {
        emailInput.value =
            roleEmail;
    }

    if (
        rememberedEmails[requestedRole]
    ) {
        rememberMeInput.checked =
            true;
    }

    if (requestedRole) {
        const roleName =
            ROLE_LABELS[requestedRole] ||
            requestedRole;

        showMessage(
            `${roleName} login selected. Enter your password to continue.`,
            "success"
        );
    }
}
form.addEventListener(
    "submit",
    async (event) => {
        event.preventDefault();

        clearMessage();

        const email =
            emailInput.value
                .trim()
                .toLowerCase();

        const password =
            passwordInput.value;
        const requestedRole =
    getRequestedRole();
        if (!email || !password) {
            showMessage(
                "Enter your email and password."
            );
            return;
        }

        loginInProgress = true;
        setLoading(true);

        try {
            const persistence =
                rememberMeInput.checked
                    ? browserLocalPersistence
                    : browserSessionPersistence;

            await setPersistence(
                auth,
                persistence
            );
            const rememberedEmails =
    JSON.parse(
        localStorage.getItem(
            "lifeline-remembered-emails"
        ) || "{}"
    );

if (
    rememberMeInput.checked &&
    requestedRole
) {
    rememberedEmails[requestedRole] =
        email;

    localStorage.setItem(
        "lifeline-remembered-emails",
        JSON.stringify(
            rememberedEmails
        )
    );
} else if (requestedRole) {
    delete rememberedEmails[
        requestedRole
    ];

    localStorage.setItem(
        "lifeline-remembered-emails",
        JSON.stringify(
            rememberedEmails
        )
    );
}
            const credential =
                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

            await redirectAuthenticatedUser(
                credential.user
            );
        } catch (error) {
            console.error(
                "Login failed:",
                error
            );

            await recordLoginAudit({
                uid: auth.currentUser?.uid,
                email,
                role: null,
                success: false,
                message:
                    error?.code ||
                    error?.message ||
                    "Login failed"
            });

            if (auth.currentUser) {
                await signOut(auth);
            }

            showMessage(
                getFriendlyError(error)
            );

            setLoading(false);
            loginInProgress = false;
        }
    }
);

onAuthStateChanged(
    auth,
    async (user) => {
        if (!user || loginInProgress) {
            return;
        }

        try {
            const requestedRole = getRequestedRole();
            const profile = await getUserProfile(user.uid);
            const role = normaliseRole(profile.role);

            if (requestedRole && requestedRole !== role) {
                setLoading(false);
                return;
            }

            setLoading(true);
            await redirectAuthenticatedUser(user);
        } catch (error) {
            console.error(
                "Existing session validation failed:",
                error
            );

            sessionStorage.removeItem(
                "lifeline-auth-session"
            );

            showMessage(
                getFriendlyError(error)
            );

            setLoading(false);
        }
    }
);
initializeRoleLogin();
