import {
    auth
} from "./firebase-config.js";

import {
    onAuthStateChanged,
    signInAnonymously
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

let authenticationPromise = null;

export function ensureReview1Authentication() {
    if (authenticationPromise) {
        return authenticationPromise;
    }

    authenticationPromise =
        new Promise((resolve, reject) => {
            const unsubscribe =
                onAuthStateChanged(
                    auth,
                    async (user) => {
                        if (user) {
                            unsubscribe();
                            resolve(user);
                            return;
                        }

                        try {
                            await signInAnonymously(auth);
                        } catch (error) {
                            unsubscribe();
                            reject(error);
                        }
                    }
                );
        });

    return authenticationPromise;
}
