LifeLine AI – Shared Driver Pool Hotfix
========================================

WHAT CHANGED
------------
1. Every logged-in hospital can assign any driver whose Firestore status is exactly "Available".
2. The optional hospital field in a driver profile no longer restricts assignment.
3. Assignment is protected by a Firestore transaction, so two hospitals cannot reserve the same available driver at the same time.
4. A reserved driver immediately becomes "Busy".
5. If the driver is Busy, Offline, or otherwise unavailable, a professional failure toast appears.
6. When the emergency is completed, rejected by the hospital, or deleted, the assigned driver becomes Available again.
7. Existing hospital emergency isolation remains unchanged. Hospitals still manage only emergencies submitted to them.

QUICK INSTALL – HOTFIX ONLY
---------------------------
1. Keep a backup of your current project.
2. Open the hotfix ZIP.
3. Copy this file:
   js/modules/hospital.js
4. Replace the same file in your current project:
   <your-project>/js/modules/hospital.js
5. Start the project with Live Server and hard refresh using Ctrl + F5.

TEST
----
1. In Firestore, make sure driver1 has status: Available
2. Log in to Apollo, Care, Yashoda, or City Hospital.
3. Open an emergency and click Assign Driver.
4. Enter driver1.
5. Expected: success toast and driver1 changes to Busy.
6. From another hospital, try assigning driver1 to another emergency.
7. Expected: failure toast saying the driver is currently Busy.
8. Complete or reject the first emergency.
9. Expected: driver1 changes back to Available and can be assigned again.

IMPORTANT
---------
The status spelling should be one of:
Available
Busy
Offline

No Firestore collection names were changed.
