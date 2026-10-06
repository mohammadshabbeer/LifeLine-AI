import {
    logoutUser
} from "./auth-guard.js";

const SESSION_KEY =
    "lifeline-auth-session";

const SESSION_TIMEOUT =
    30 * 60 * 1000;

const WARNING_BEFORE_EXPIRY =
    5 * 60 * 1000;

let warningDisplayed = false;
let countdownInterval = null;

function getSession() {
    try {
        return JSON.parse(
            sessionStorage.getItem(
                SESSION_KEY
            ) || "null"
        );
    } catch (error) {
        console.error(
            "Unable to read authentication session:",
            error
        );

        return null;
    }
}

function saveSession(session) {
    sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify(session)
    );
}

function formatRole(role) {
    const roles = {
        ADMIN: "Administrator",
        HOSPITAL: "Hospital Staff",
        DRIVER: "Ambulance Driver",
        PATIENT: "Patient"
    };

    return roles[role] || role;
}

function getInitial(name) {
    return String(name || "U")
        .trim()
        .charAt(0)
        .toUpperCase();
}

function injectStyles() {
    if (
        document.getElementById(
            "lifeline-auth-ui-styles"
        )
    ) {
        return;
    }

    const style =
        document.createElement("style");

    style.id =
        "lifeline-auth-ui-styles";

    style.textContent = `
        .lifeline-user-panel {
            position: fixed;
            top: 18px;
            right: 190px;
            z-index: 9990;
            display: flex;
            align-items: center;
            gap: 11px;
            padding: 9px 12px;
            border: 1px solid rgba(148, 163, 184, 0.24);
            border-radius: 14px;
            background: rgba(255, 255, 255, 0.94);
            box-shadow:
                0 12px 32px rgba(15, 23, 42, 0.14);
            backdrop-filter: blur(14px);
        }

        [data-theme="dark"]
        .lifeline-user-panel {
            border-color:
                rgba(148, 163, 184, 0.18);
            background:
                rgba(15, 23, 42, 0.94);
            color: #f8fafc;
        }

        .lifeline-user-avatar {
            display: grid;
            place-items: center;
            width: 39px;
            height: 39px;
            flex: 0 0 auto;
            border-radius: 50%;
            background:
                linear-gradient(
                    135deg,
                    #2563eb,
                    #06b6d4
                );
            color: white;
            font-size: 16px;
            font-weight: 800;
        }

        .lifeline-user-details {
            min-width: 0;
        }

        .lifeline-user-details strong {
            display: block;
            max-width: 170px;
            overflow: hidden;
            color: #0f172a;
            font-size: 13px;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        [data-theme="dark"]
        .lifeline-user-details strong {
            color: #f8fafc;
        }

        .lifeline-user-details span {
            display: block;
            margin-top: 2px;
            color: #64748b;
            font-size: 11px;
        }

        .lifeline-logout-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            min-height: 36px;
            padding: 8px 11px;
            border: none;
            border-radius: 10px;
            background: #fee2e2;
            color: #b91c1c;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            transition:
                transform 0.2s ease,
                background 0.2s ease;
        }

        .lifeline-logout-button:hover {
            background: #fecaca;
            transform: translateY(-1px);
        }

        .lifeline-session-overlay {
            position: fixed;
            inset: 0;
            z-index: 10000;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background:
                rgba(15, 23, 42, 0.65);
            backdrop-filter: blur(7px);
        }

        .lifeline-session-overlay.show {
            display: flex;
        }

        .lifeline-session-modal {
            width: min(430px, 100%);
            padding: 28px;
            border-radius: 20px;
            background: white;
            box-shadow:
                0 30px 80px
                rgba(15, 23, 42, 0.3);
            text-align: center;
        }

        [data-theme="dark"]
        .lifeline-session-modal {
            background: #111827;
            color: #f8fafc;
        }

        .lifeline-session-icon {
            display: grid;
            place-items: center;
            width: 64px;
            height: 64px;
            margin: 0 auto 16px;
            border-radius: 50%;
            background: #fef3c7;
            color: #d97706;
            font-size: 27px;
        }

        .lifeline-session-modal h3 {
            margin: 0 0 10px;
            font-size: 22px;
        }

        .lifeline-session-modal p {
            margin: 0;
            color: #64748b;
            line-height: 1.6;
        }

        .lifeline-countdown {
            display: inline-block;
            margin: 16px 0;
            color: #dc2626;
            font-size: 25px;
            font-weight: 800;
        }

        .lifeline-session-actions {
            display: grid;
            grid-template-columns:
                repeat(2, minmax(0, 1fr));
            gap: 10px;
            margin-top: 8px;
        }

        .lifeline-session-actions button {
            min-height: 44px;
            border: none;
            border-radius: 11px;
            font-weight: 700;
            cursor: pointer;
        }

        .lifeline-stay-button {
            background: #2563eb;
            color: white;
        }

        .lifeline-signout-button {
            background: #f1f5f9;
            color: #334155;
        }

        @media (max-width: 768px) {
            .lifeline-user-panel {
                position: relative;
                top: auto;
                right: auto;
                width: calc(100% - 24px);
                margin: 12px;
            }

            .lifeline-user-details {
                flex: 1;
            }

            .lifeline-session-actions {
                grid-template-columns: 1fr;
            }
        }
    `;

    document.head.appendChild(style);
}

function createUserPanel(session) {
    if (
        document.getElementById(
            "lifelineUserPanel"
        )
    ) {
        return;
    }

    const panel =
        document.createElement("div");

    panel.id = "lifelineUserPanel";
    panel.className =
        "lifeline-user-panel";

    panel.innerHTML = `
        <div class="lifeline-user-avatar">
            ${getInitial(session.name)}
        </div>

        <div class="lifeline-user-details">
            <strong>
                ${session.name || "LifeLine User"}
            </strong>

            <span>
                ${formatRole(session.role)}
            </span>
        </div>

        <button
            type="button"
            id="lifelineLogoutButton"
            class="lifeline-logout-button"
        >
            <i class="fa-solid fa-arrow-right-from-bracket"></i>
            Logout
        </button>
    `;

    document.body.appendChild(panel);

    document
        .getElementById(
            "lifelineLogoutButton"
        )
        .addEventListener(
            "click",
            async () => {
                const confirmed =
                    window.confirm(
                        "Are you sure you want to sign out?"
                    );

                if (!confirmed) {
                    return;
                }

                await logoutUser();
            }
        );
}

function createSessionModal() {
    if (
        document.getElementById(
            "lifelineSessionOverlay"
        )
    ) {
        return;
    }

    const overlay =
        document.createElement("div");

    overlay.id =
        "lifelineSessionOverlay";

    overlay.className =
        "lifeline-session-overlay";

    overlay.innerHTML = `
        <div
            class="lifeline-session-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sessionWarningTitle"
        >
            <div class="lifeline-session-icon">
                <i class="fa-solid fa-clock"></i>
            </div>

            <h3 id="sessionWarningTitle">
                Session Expiring Soon
            </h3>

            <p>
                Your secure session will expire
                because no activity was detected.
            </p>

            <div
                id="lifelineCountdown"
                class="lifeline-countdown"
            >
                05:00
            </div>

            <div class="lifeline-session-actions">
                <button
                    type="button"
                    id="lifelineStayButton"
                    class="lifeline-stay-button"
                >
                    Stay Signed In
                </button>

                <button
                    type="button"
                    id="lifelineSignoutButton"
                    class="lifeline-signout-button"
                >
                    Sign Out
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    document
        .getElementById(
            "lifelineStayButton"
        )
        .addEventListener(
            "click",
            extendSession
        );

    document
        .getElementById(
            "lifelineSignoutButton"
        )
        .addEventListener(
            "click",
            logoutUser
        );
}

function extendSession() {
    const session = getSession();

    if (!session) {
        return;
    }

    session.lastActivity =
        Date.now();

    saveSession(session);

    warningDisplayed = false;

    document
        .getElementById(
            "lifelineSessionOverlay"
        )
        ?.classList.remove("show");

    if (countdownInterval) {
        window.clearInterval(
            countdownInterval
        );

        countdownInterval = null;
    }
}

function formatCountdown(milliseconds) {
    const totalSeconds =
        Math.max(
            0,
            Math.ceil(
                milliseconds / 1000
            )
        );

    const minutes =
        Math.floor(
            totalSeconds / 60
        );

    const seconds =
        totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function showExpiryWarning() {
    if (warningDisplayed) {
        return;
    }

    warningDisplayed = true;

    const overlay =
        document.getElementById(
            "lifelineSessionOverlay"
        );

    overlay?.classList.add("show");

    countdownInterval =
        window.setInterval(() => {
            const session =
                getSession();

            if (!session) {
                window.clearInterval(
                    countdownInterval
                );

                return;
            }

            const elapsed =
                Date.now() -
                Number(
                    session.lastActivity ||
                    0
                );

            const remaining =
                SESSION_TIMEOUT -
                elapsed;

            const countdown =
                document.getElementById(
                    "lifelineCountdown"
                );

            if (countdown) {
                countdown.textContent =
                    formatCountdown(
                        remaining
                    );
            }

            if (remaining <= 0) {
                window.clearInterval(
                    countdownInterval
                );

                logoutUser();
            }
        }, 1000);
}

function monitorSession() {
    window.setInterval(() => {
        const session =
            getSession();

        if (!session) {
            return;
        }

        const inactiveTime =
            Date.now() -
            Number(
                session.lastActivity ||
                0
            );

        const timeRemaining =
            SESSION_TIMEOUT -
            inactiveTime;

        if (
            timeRemaining <=
                WARNING_BEFORE_EXPIRY &&
            timeRemaining > 0
        ) {
            showExpiryWarning();
        }
    }, 10000);
}

function initializeAuthUI(session) {
    injectStyles();
    createUserPanel(session);
    createSessionModal();
    monitorSession();
}

window.addEventListener(
    "lifeline-auth-ready",
    (event) => {
        initializeAuthUI(
            event.detail
        );
    }
);

const existingSession = getSession();

if (existingSession) {
    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            () => {
                initializeAuthUI(
                    existingSession
                );
            }
        );
    } else {
        initializeAuthUI(
            existingSession
        );
    }
}