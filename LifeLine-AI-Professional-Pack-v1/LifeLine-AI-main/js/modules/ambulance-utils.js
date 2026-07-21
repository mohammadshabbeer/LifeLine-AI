export function getDistance(lat1,lon1,lat2,lon2){

const R=6371;

const dLat=(lat2-lat1)*Math.PI/180;
const dLon=(lon2-lon1)*Math.PI/180;

const a=
Math.sin(dLat/2)*Math.sin(dLat/2)+
Math.cos(lat1*Math.PI/180)*
Math.cos(lat2*Math.PI/180)*
Math.sin(dLon/2)*
Math.sin(dLon/2);

const c=2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));

return R*c;

}

export function updateDistanceETA(distance){

let speed=45;

let eta=Math.ceil((distance/speed)*60);

document.getElementById("distance").innerHTML=
distance.toFixed(2)+" KM";

document.getElementById("speed").innerHTML=
speed+" km/h";

document.getElementById("eta").innerHTML=
eta+" Min";

}