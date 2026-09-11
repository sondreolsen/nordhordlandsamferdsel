"use client";
import {forwardRef,useEffect,useImperativeHandle,useRef,useState} from "react";
import type {Map as GLMap,Marker} from "maplibre-gl";
import {places,stops,kinds,oldPosition,type Kind,type Vehicle} from "../lib/traffic";
import "maplibre-gl/dist/maplibre-gl.css";
export type MapHandle={go:(name:string)=>void;zoom:(amount:number)=>void;north:()=>void;pitch:(three:boolean)=>void;focus:(v:Vehicle)=>void};
export default forwardRef<MapHandle,{vehicles:Vehicle[];enabled:Record<Kind,boolean>;now:number;selected:string|null;onSelect:(v:Vehicle)=>void;onStop:(id:string)=>void;onVisible:(ids:string[])=>void}>(function TrafficMap({vehicles,enabled,now,selected,onSelect,onStop,onVisible},ref){
 const container=useRef<HTMLDivElement>(null), map=useRef<GLMap|null>(null), markers=useRef(new Map<string,Marker>()), callbacks=useRef({onSelect,onStop,onVisible}), current=useRef(vehicles);
 callbacks.current={onSelect,onStop,onVisible};current.current=vehicles;
 const [ready,setReady]=useState(false),[failed,setFailed]=useState(false);
 function fit(){map.current?.setTerrain(null);map.current?.fitBounds([[4.77,60.494],[5.37,60.854]],{padding:{top:90,bottom:85,left:55,right:55},duration:1000,pitch:0,bearing:0});}
 useImperativeHandle(ref,()=>({go(name){const p=places.find(p=>p.name===name);if(p)map.current?.flyTo({center:[p.lon,p.lat],zoom:p.zoom,duration:1600});else fit();},zoom(amount){map.current?.zoomTo((map.current?.getZoom()||10)+amount);},north(){map.current?.easeTo({bearing:0});},pitch(three){const m=map.current;if(!m)return;m.setTerrain(three?{source:"terrain",exaggeration:1.15}:null);m.easeTo({pitch:three?55:0,duration:1000});},focus(v){map.current?.flyTo({center:[v.lon,v.lat],zoom:Math.max(map.current.getZoom(),13),duration:1000});}}));
 useEffect(()=>{let cancelled=false;let resize:ResizeObserver|undefined;
 import("maplibre-gl").then(gl=>{if(cancelled||!container.current)return;const m=new gl.Map({container:container.current,style:"/map-style.json",center:[5.09,60.66],zoom:10,bearing:0,pitch:0,minZoom:8,maxZoom:18,attributionControl:{compact:true},maxBounds:[[4.15,60.1],[6,61.2]]});map.current=m;
 const timer=setTimeout(()=>{if(!m.isStyleLoaded())setFailed(true);},25000);
 m.on("load",()=>{clearTimeout(timer);setReady(true);setFailed(false);fit();m.addSource("terrain",{type:"raster-dem",url:"https://tiles.mapterhorn.com/tilejson.json",tileSize:512,encoding:"terrarium",attribution:'Terreng © <a href="https://mapterhorn.com/attribution">Mapterhorn</a>'});m.addControl(new gl.ScaleControl({maxWidth:110,unit:"metric"}),"bottom-left");
 for(const p of places){const el=document.createElement("button");el.className="place-pin";el.textContent=p.name;el.setAttribute("aria-label","Vis "+p.name);el.onclick=()=>m.flyTo({center:[p.lon,p.lat],zoom:p.zoom,duration:1200});new gl.Marker({element:el,anchor:"bottom-left"}).setLngLat([p.lon,p.lat]).addTo(m);}
 for(const s of stops){const el=document.createElement("button");el.className="stop-pin";el.title=s.name+" – avganger";el.setAttribute("aria-label",s.name+" – avganger");el.textContent="·";el.onclick=()=>callbacks.current.onStop(s.id);new gl.Marker({element:el}).setLngLat([s.lon,s.lat]).addTo(m);}
 });
 m.on("moveend",()=>{const b=m.getBounds();callbacks.current.onVisible(current.current.filter(v=>b.contains([v.lon,v.lat])).map(v=>v.id));});
 m.on("error",e=>{if(!m.isStyleLoaded()&&e.error?.message?.includes("style"))setFailed(true);});
 resize=new ResizeObserver(()=>m.resize());resize.observe(container.current);
 }).catch(()=>setFailed(true));
 return()=>{cancelled=true;resize?.disconnect();map.current?.remove();map.current=null;markers.current.clear();};},[]);
 useEffect(()=>{if(!ready||!map.current)return;let cancelled=false;import("maplibre-gl").then(gl=>{if(cancelled||!map.current)return;
 const visible=vehicles.filter(v=>enabled[v.kind]);const ids=new Set(visible.map(v=>v.id));
 for(const [id,m] of markers.current){if(!ids.has(id)){m.remove();markers.current.delete(id);}}
 for(const v of visible){let marker=markers.current.get(v.id);if(!marker){const el=document.createElement("button");el.onclick=()=>{const latest=current.current.find(x=>x.id===v.id);if(latest)callbacks.current.onSelect(latest);};marker=new gl.Marker({element:el,anchor:"center"}).setLngLat([v.lon,v.lat]).addTo(map.current);markers.current.set(v.id,marker);}
 const el=marker.getElement();el.className="maplibregl-marker maplibregl-marker-anchor-center vehicle-pin "+v.kind+(selected===v.id?" selected":"")+(oldPosition(v,now)?" old":"");
 el.style.setProperty("--vehicle-color",kinds.find(k=>k.id===v.kind)!.color);
 el.title=v.name+(v.destination?" → "+v.destination:"");el.setAttribute("aria-label",el.title);el.setAttribute("aria-pressed",String(selected===v.id));
 el.replaceChildren();if(v.kind==="bus"){el.textContent=v.line||"B";}else{const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("viewBox","0 0 24 28");svg.setAttribute("aria-hidden","true");const path=document.createElementNS("http://www.w3.org/2000/svg","path");path.setAttribute("d",v.kind==="ferry"?"M12 2 20 10 20 24 4 24 4 10Z":"M12 2 19 24 12 20 5 24Z");svg.appendChild(path);svg.style.transform="rotate("+(v.bearing??0)+"deg)";el.appendChild(svg);}
 marker.setLngLat([v.lon,v.lat]);
 }
 const b=map.current.getBounds();callbacks.current.onVisible(vehicles.filter(v=>b.contains([v.lon,v.lat])).map(v=>v.id));
 });return()=>{cancelled=true;};},[vehicles,enabled,ready,selected,now]);
 return <><div ref={container} className="map-canvas" role="region" aria-label="Interaktivt trafikkart over Nordhordland"/>{!ready&&!failed&&<div className="map-loading"><span className="loading-ring"/>Laster Nordhordland …</div>}{failed&&<div className="map-error"><strong>Kartet kunne ikke lastes</strong><p>Kontroller nettilkoblingen. Trafikklisten og avgangene kan fortsatt brukes.</p><button onClick={()=>window.location.reload()}>Prøv igjen</button></div>}</>;
});


