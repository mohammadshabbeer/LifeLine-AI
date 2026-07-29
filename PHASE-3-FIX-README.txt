LifeLine AI - React + Spring Boot Integration Fix

Fixed:
1. Removed Spring Boot useState hooks from useRealtimeCollection().
2. Removed useEffect from inside useMemo().
3. Added Spring Boot status hook at the top level of App().
4. Added React development origins (localhost:5173 and 127.0.0.1:5173) to Spring Boot CORS.
5. Kept Firebase collections read-only and unchanged.

RUN:
Terminal 1:
cd springboot-api
mvn spring-boot:run

Terminal 2:
cd react-dashboard
npm install
npm run dev

Open:
http://localhost:5173

After testing, generate the integrated production build:
cd react-dashboard
npm run build

Then open the main project with Live Server and use React Analytics from the Hospital portal.
