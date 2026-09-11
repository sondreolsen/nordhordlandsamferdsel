import {inRegion,type Vehicle,type Feed} from "../../../lib/traffic";
export const dynamic="force-dynamic";
const cache=new Map<string,{expires:number;data:Feed}>();
const pending=new Map<string,Promise<Feed>>();
async function json(url:string,init?:RequestInit){const r=await fetch(url,{...init,signal:AbortSignal.timeout(18000)});if(!r.ok)throw new Error("Kilden svarer ikke");const j=await r.json() as Record<string, any>;if(j.error||j.errors)throw new Error("Kilden returnerte en feil");return j;}
const ferryNames=new Set(["STORFJORD","FEDJEBJORN","FEDJEBJØRN"]);
async function load(source:string):Promise<Feed>{
 const fetched=new Date().toISOString();
 if(source==="bus"){
 const j=await json("https://api.entur.io/realtime/v2/vehicles/graphql",{method:"POST",headers:{"content-type":"application/json","ET-Client-Name":"nordhordland-trafikkart"},body:JSON.stringify({query:'{ vehicles(codespaceId:"SKY") { vehicleId mode lastUpdated expiration bearing delay destinationName location { latitude longitude } line { publicCode lineName } } }'})});
 if(!Array.isArray(j.data?.vehicles))throw new Error("Uventet datasvar");
 const unique=new Map<string,Vehicle>();
 for(const v of j.data.vehicles){if(v.mode!=="BUS"||!inRegion(v.location?.latitude,v.location?.longitude))continue;
 const item:Vehicle={id:"bus-"+v.vehicleId,kind:"bus",name:v.line?.publicCode?"Buss "+v.line.publicCode:"Buss",line:v.line?.publicCode,route:v.line?.lineName,destination:v.destinationName,lat:v.location.latitude,lon:v.location.longitude,bearing:v.bearing??null,speed:null,updated:v.lastUpdated||null,fetched,source:"Entur",delay:v.delay??null};
 const prev=unique.get(item.id);if(!prev||Date.parse(item.updated||"")>Date.parse(prev.updated||""))unique.set(item.id,item);
 }
 return {vehicles:[...unique.values()],fetched,partial:false,status:"ok"};
 }
 const centers=[[60.535,5.27,12],[60.65,5.04,14],[60.80,4.96,15]];
 const results=await Promise.allSettled(centers.map(async([lat,lon,radius])=>{
 const j=await json("https://allemannsdata.com/wiki/api/v1/kilder/ais/find_vessels_nearby?"+new URLSearchParams({lat:String(lat),lon:String(lon),radius_km:String(radius),limit:"100"}));
 if(!Array.isArray(j.data?.fartoy))throw new Error("Uventet datasvar");
 return j;
 }));
 if(results.every(r=>r.status==="rejected"))throw new Error("AIS er utilgjengelig");
 const vehicles=new Map<string,Vehicle>();let partial=false;
 for(const r of results){if(r.status==="rejected"){partial=true;continue;}const j=r.value;partial ||= !!j._meta?.pagination?.has_more_results;
 for(const v of j.data.fartoy){if(!inRegion(v.lat,v.lon)||!v.vessel_id)continue;
 const n=(v.navn||"").toUpperCase(), t=Number(v.skipstype);
 const kind=ferryNames.has(n)?"ferry":(t>=40&&t<50)||(t>=60&&t<70)||t===36||t===37?"boat":"ship";
 const item:Vehicle={id:"ais-"+v.vessel_id,kind,name:v.navn||"Fartøy "+v.vessel_id,lat:v.lat,lon:v.lon,bearing:v.kurs??null,speed:v.fart_knop??null,updated:v.sist_oppdatert||null,fetched:j._meta?.retrieved_at||fetched,destination:v.destinasjon||undefined,source:"AIS",delay:null};
 vehicles.set(item.id,item);
 }}
 return {vehicles:[...vehicles.values()],fetched,partial,status:"ok"};
}
export async function GET(request:Request){
 const source=new URL(request.url).searchParams.get("source");
 if(source!=="bus"&&source!=="ais")return Response.json({error:"Ugyldig kilde"},{status:400});
 let entry=cache.get(source);
 if(entry&&entry.expires>Date.now())return Response.json(entry.data,{headers:{"Cache-Control":"public, max-age=15"}});
 try{let work=pending.get(source);if(!work){work=load(source).then(data=>{cache.set(source,{data,expires:Date.now()+(source==="bus"?25000:300000)});return data;}).finally(()=>pending.delete(source));pending.set(source,work);}const data=await work;return Response.json(data,{headers:{"Cache-Control":source==="bus"?"public, max-age=25":"public, max-age=120"}});}
 catch{return Response.json({vehicles:[],fetched:new Date().toISOString(),partial:true,status:"error",message:source==="bus"?"Bussposisjoner er midlertidig utilgjengelige.":"AIS er midlertidig utilgjengelig."},{status:503});}
}


