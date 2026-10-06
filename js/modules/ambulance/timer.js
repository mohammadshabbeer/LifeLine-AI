export function startResponseTimer(){

const dispatchTime=new Date();

const box=document.createElement("div");

box.id="responseTimer";

box.style.position="fixed";
box.style.top="80px";
box.style.right="20px";
box.style.background="#0f172a";
box.style.color="white";
box.style.padding="12px 18px";
box.style.borderRadius="10px";
box.style.fontWeight="bold";
box.style.zIndex="9999";

document.body.appendChild(box);

setInterval(()=>{

const now=new Date();

const sec=Math.floor((now-dispatchTime)/1000);

const min=Math.floor(sec/60);

const rem=sec%60;

box.innerHTML=
`⏱ Response Time : ${min}m ${rem}s`;

},1000);

}