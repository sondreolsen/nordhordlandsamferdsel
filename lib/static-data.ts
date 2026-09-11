import {approximateVesselBeam,approximateVesselLength,inRegion,vesselTypeName,type Feed,type Vehicle} from "./traffic";

const ferryNames=new Set(["STORFJORD","FEDJEBJORN","FEDJEBJØRN"]);

async function readJson(url:string,init?:RequestInit){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),18000);
 try{
  const r=await fetch(url,{...init,signal:controller.signal});
  if(!r.ok)throw new Error("Kilden svarer ikke");
  const j=await r.json() as Record<string, any>;
  if(j.error||j.errors)throw new Error("Kilden returnerte en feil");
  return j;
 }finally{clearTimeout(timer);}
}

export async function loadStaticTraffic(source:string):Promise<Feed>{
 const fetched=new Date().toISOString();
 if(source==="bus"){
  const j=await readJson("https://api.entur.io/realtime/v2/vehicles/graphql",{method:"POST",headers:{"content-type":"application/json","ET-Client-Name":"nordhordland-trafikkart"},body:JSON.stringify({query:'{ vehicles(codespaceId:"SKY") { vehicleId mode lastUpdated expiration bearing delay destinationName location { latitude longitude } line { publicCode lineName } } }'})});
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
  const j=await readJson("https://allemannsdata.com/wiki/api/v1/kilder/ais/find_vessels_nearby?"+new URLSearchParams({lat:String(lat),lon:String(lon),radius_km:String(radius),limit:"100"}));
  if(!Array.isArray(j.data?.fartoy))throw new Error("Uventet datasvar");
  return j;
 }));
 if(results.every(r=>r.status==="rejected"))throw new Error("AIS er utilgjengelig");
 const vehicles=new Map<string,Vehicle>();let partial=false;
 for(const r of results){if(r.status==="rejected"){partial=true;continue;}const j=r.value;partial ||= !!j._meta?.pagination?.has_more_results;
  for(const v of j.data.fartoy){if(!inRegion(v.lat,v.lon)||!v.vessel_id)continue;
   const n=(v.navn||"").toUpperCase(), t=Number(v.skipstype);
   const kind=ferryNames.has(n)?"ferry":(t>=40&&t<50)||(t>=60&&t<70)||t===36||t===37?"boat":"ship";
   const length=approximateVesselLength(kind,t,v.navn||"");
   const item:Vehicle={id:"ais-"+v.vessel_id,kind,name:v.navn||"Fartøy "+v.vessel_id,lat:v.lat,lon:v.lon,bearing:v.kurs??null,speed:v.fart_knop??null,updated:v.sist_oppdatert||null,fetched:j._meta?.retrieved_at||fetched,destination:v.destinasjon||undefined,source:"AIS",delay:null,sizeMeters:length,beamMeters:approximateVesselBeam(length,kind),mmsi:String(v.vessel_id),vesselType:vesselTypeName(t,kind),docked:Number(v.fart_knop??0)<=0.2};
   vehicles.set(item.id,item);
  }}
 return {vehicles:[...vehicles.values()],fetched,partial,status:"ok"};
}

export async function loadStaticDepartures(stop:string){
 const j=await readJson("https://allemannsdata.com/wiki/api/v1/kilder/entur/get_departures?"+new URLSearchParams({stop_place_id:stop,number_of_departures:"12",time_range_seconds:"21600"}));
 if(!Array.isArray(j.data?.estimatedCalls))throw new Error("Ugyldig avgangssvar");
 return {name:j.data.name,calls:j.data.estimatedCalls,fetched:j._meta?.retrieved_at||new Date().toISOString()};
}
