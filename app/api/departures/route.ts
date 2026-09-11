import {stops} from "../../../lib/traffic";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 const id=new URL(request.url).searchParams.get("stop");
 if(!stops.some(s=>s.id===id))return Response.json({error:"Ukjent holdeplass"},{status:400});
 try{
 const r=await fetch("https://allemannsdata.com/wiki/api/v1/kilder/entur/get_departures?"+new URLSearchParams({stop_place_id:id!,number_of_departures:"12",time_range_seconds:"21600"}),{signal:AbortSignal.timeout(18000)});
 if(!r.ok)throw new Error("Utilgjengelig");
 const j=await r.json() as Record<string, any>;if(j.error||!Array.isArray(j.data?.estimatedCalls))throw new Error("Ugyldig");
 return Response.json({name:j.data.name,calls:j.data.estimatedCalls,fetched:j._meta?.retrieved_at||new Date().toISOString()},{headers:{"Cache-Control":"public, max-age=30"}});
 }catch{return Response.json({error:"Avgangene er midlertidig utilgjengelige. Prøv igjen om litt."},{status:503});}
}


