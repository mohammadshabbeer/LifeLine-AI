// ===============================
// Leaflet Map Module
// ===============================
import {
    onSnapshot,
    doc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import { db } from "../firebase/firebase-config.js";
export function initMap(hospitalLat, hospitalLng, patientLat, patientLng, patientName) {

    const map = L.map("map");

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution: "© OpenStreetMap"
        }
    ).addTo(map);

    // Hospital Marker
    const hospitalMarker = L.marker([hospitalLat, hospitalLng])
        .addTo(map)
        .bindPopup("🏥 Hospital");

    // Patient Marker
    const patientMarker = L.marker([patientLat, patientLng])
        .addTo(map)
        .bindPopup(patientName);

    // Ambulance Marker
    const ambulance = L.marker(
        [hospitalLat, hospitalLng],
        {
            icon: L.divIcon({
                html: "<div style='font-size:34px;'>🚑</div>",
                className: "",
                iconSize: [40, 40]
            })
        }
    ).addTo(map);

    // Show only hospital and patient initially
    const bounds = L.latLngBounds(
        [
            [hospitalLat, hospitalLng],
            [patientLat, patientLng]
        ]
    );

    map.fitBounds(bounds, {
        padding: [60, 60]
    });

    // Routing
    const routingControl = L.Routing.control({

        waypoints: [
            L.latLng(hospitalLat, hospitalLng),
            L.latLng(patientLat, patientLng)
        ],

        addWaypoints: false,
        draggableWaypoints: false,
        routeWhileDragging: false,
        fitSelectedRoutes: false,
        show: false,
        createMarker: () => null,

        lineOptions: {
            styles: [
                {
                    color: "#0B5ED7",
                    weight: 6,
                    opacity: 0.9
                }
            ]
        }

    }).addTo(map);

     // Live ambulance position
const params = new URLSearchParams(window.location.search);

const emergencyId = params.get("id");

if(emergencyId){

    onSnapshot(doc(db,"alerts",emergencyId),(snap)=>{

        if(!snap.exists()) return;

        const data = snap.data();

        if(data.ambulanceLat && data.ambulanceLng){

            ambulance.setLatLng([

                data.ambulanceLat,

                data.ambulanceLng

            ]);

        }

    });

}
    return {

        map,
        ambulance,
        routingControl,
        hospitalLat,
        hospitalLng,
        patientLat,
        patientLng

    };

}