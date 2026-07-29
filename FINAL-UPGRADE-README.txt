LifeLine AI - Final Upgrade

1. Driver previous-patient history
- Fixed the completed-trip page so it uses the currently selected driver instead of always reading driver1.
- Completed alerts now appear automatically for each driver with patient name, phone, hospital, symptoms, date and trip ID.

2. User live status tracker
- The Firestore listener now starts immediately after a new emergency is submitted.
- No refresh is needed.
- Status is calculated from both hospital status and driver status for Accepted, Dispatched, Arrived and Completed stages.
- Final status remains visible briefly instead of disappearing immediately.

3. Premium UI upgrade
- Added css/final-enhancements.css to all main HTML pages.
- Added glass surfaces, improved spacing, gradients, shadows, hover effects, better forms, tables and buttons.
- Existing page functionality and Firebase logic were not replaced.

Testing
- Open index.html with Live Server.
- Submit an emergency and keep the user page open.
- Update the same alert from the hospital/driver portals and confirm status changes automatically.
- Complete a trip, choose the same driver, and open driver-completed.html.
