import { updateDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
export async function startAnimation(

    map,

    ambulance,

    routingControl,

    hospitalLat,

    hospitalLng,

    patientLat,

    patientLng,

    emergencyRef

){

    let speed = 45;

    const totalDistance = getDistance(
        hospitalLat,
        hospitalLng,
        patientLat,
        patientLng
    );

    let eta = Math.max(
        1,
        Math.ceil((totalDistance / speed) * 60)
    );

    document.getElementById("distance").textContent =
        totalDistance.toFixed(2) + " KM";

    document.getElementById("speed").textContent =
        speed + " km/h";

    document.getElementById("eta").textContent =
        eta + " Min";

    document.getElementById("status").textContent =
        "🚑 Ambulance Dispatched";

    // Wait until route is generated
    const route = await new Promise((resolve)=>{

        routingControl.on("routesfound",(e)=>{

    console.log("Route Points:", e.routes[0].coordinates.length);

    resolve(e.routes[0].coordinates);

});

    });

    const steps = route.length;

    let current = 0;

    const timer = setInterval(async()=>{

        // Finished
        console.log("Current =", current);
console.log("Steps =", steps);

if(current >= steps){

    clearInterval(timer);

    document.getElementById("progressFill").style.width="100%";

    document.getElementById("progressPercent").textContent="100%";

    document.getElementById("status").textContent="✅ Ambulance Arrived";

    ambulance.bindPopup("🚑 Arrived").openPopup();

    await updateDoc(emergencyRef,{
        status:"Arrived",
        arrivedAt:new Date()
    });

    return;
}

        const point = route[current];

ambulance.setLatLng([
    point.lat,
    point.lng
]);

await updateDoc(emergencyRef,{
    ambulanceLat: point.lat,
    ambulanceLng: point.lng
});

        map.panTo(
            [point.lat,point.lng],
            {
                animate:true
            }
        );

        const progress = ((current + 1) / steps) * 100;

        document.getElementById("progressFill").style.width =
            progress + "%";

        document.getElementById("progressPercent").textContent =
            Math.floor(progress) + "%";

        if(current % 20 === 0){

            eta--;

            if(eta < 1){

                eta = 1;

            }

            document.getElementById("eta").textContent =
                eta + " Min";

        }

        if(progress < 25){

            document.getElementById("status").textContent =
                "🚑 Ambulance Dispatched";

        }
        else if(progress < 50){

            document.getElementById("status").textContent =
                "🚑 On Route";

        }
        else if(progress < 75){

            document.getElementById("status").textContent =
                "🚑 Halfway";

        }
        else if(progress < 99){

            document.getElementById("status").textContent =
                "🟠 Near Patient";

        }
        else{

            document.getElementById("status").textContent =
                "🚑 Almost Arrived";

        }

        current++;

    },80);

}

function getDistance(lat1,lon1,lat2,lon2){

    const R = 6371;

    const dLat = (lat2-lat1)*Math.PI/180;

    const dLon = (lon2-lon1)*Math.PI/180;

    const a =
        Math.sin(dLat/2)**2 +
        Math.cos(lat1*Math.PI/180) *
        Math.cos(lat2*Math.PI/180) *
        Math.sin(dLon/2)**2;

    const c =
        2*Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1-a)
        );

    return R*c;

}
