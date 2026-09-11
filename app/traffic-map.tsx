"use client";
import {forwardRef,useEffect,useImperativeHandle,useRef,useState} from "react";
import type {Map as GLMap,Marker} from "maplibre-gl";
import {places,stops,kinds,oldPosition,type Kind,type Vehicle} from "../lib/traffic";
import "maplibre-gl/dist/maplibre-gl.css";
export type MapHandle={go:(name:string)=>void;zoom:(amount:number)=>void;north:()=>void;pitch:(three:boolean)=>void;focus:(v:Vehicle)=>void};
type Point=[number,number];
function samePoint(a:Point,b:Point){return Math.abs(a[0]-b[0])<0.000001&&Math.abs(a[1]-b[1])<0.000001;}
function vehicleSize(v:Vehicle){const meters=v.kind==="bus"?12:v.sizeMeters||42;return Math.max(1,Math.min(2.25,meters/48));}
function smoothStep(t:number){return t*t*(3-2*t);}
function bearingBetween(a:Point,b:Point){const lat=((a[1]+b[1])/2)*Math.PI/180, dx=(b[0]-a[0])*Math.cos(lat), dy=b[1]-a[1];return (Math.atan2(dx,dy)*180/Math.PI+360)%360;}
export default forwardRef<MapHandle,{vehicles:Vehicle[];enabled:Record<Kind,boolean>;now:number;selected:string|null;onSelect:(v:Vehicle)=>void;onStop:(id:string)=>void;onVisible:(ids:string[])=>void}>(function TrafficMap({vehicles,enabled,now,selected,onSelect,onStop,onVisible},ref){
 const container=useRef<HTMLDivElement>(null), map=useRef<GLMap|null>(null), markers=useRef(new Map<string,Marker>()), positions=useRef(new Map<string,Point>()), rafs=useRef(new Map<string,number>()), callbacks=useRef({onSelect,onStop,onVisible}), current=useRef(vehicles);
 callbacks.current={onSelect,onStop,onVisible};current.current=vehicles;
 const [ready,setReady]=useState(false),[failed,setFailed]=useState(false);
 function fit(){map.current?.setTerrain(null);map.current?.fitBounds([[4.77,60.494],[5.37,60.854]],{padding:{top:90,bottom:85,left:55,right:55},duration:1000,pitch:0,bearing:0});}
 useImperativeHandle(ref,()=>({go(name){const p=places.find(p=>p.name===name);if(p)map.current?.flyTo({center:[p.lon,p.lat],zoom:p.zoom,duration:1600});else fit();},zoom(amount){map.current?.zoomTo((map.current?.getZoom()||10)+amount);},north(){map.current?.easeTo({bearing:0});},pitch(three){const m=map.current;if(!m)return;m.setTerrain(three?{source:"terrain",exaggeration:1.15}:null);m.easeTo({pitch:three?55:0,duration:1000});},focus(v){map.current?.flyTo({center:[v.lon,v.lat],zoom:Math.max(map.current.getZoom(),13),duration:1000});}}));
 useEffect(()=>{let cancelled=false;let resize:ResizeObserver|undefined;
 import("maplibre-gl").then(gl=>{if(cancelled||!container.current)return;const m=new gl.Map({container:container.current,style:"map-style.json",center:[5.09,60.66],zoom:10,bearing:0,pitch:0,minZoom:8,maxZoom:18,attributionControl:{compact:true},maxBounds:[[4.15,60.1],[6,61.2]]});map.current=m;
 const timer=setTimeout(()=>{if(!m.isStyleLoaded())setFailed(true);},25000);
 m.on("load",()=>{clearTimeout(timer);setReady(true);setFailed(false);fit();m.addSource("terrain",{type:"raster-dem",url:"https://tiles.mapterhorn.com/tilejson.json",tileSize:512,encoding:"terrarium",attribution:'Terreng © <a href="https://mapterhorn.com/attribution">Mapterhorn</a>'});m.addControl(new gl.ScaleControl({maxWidth:110,unit:"metric"}),"bottom-left");
 for(const p of places){const el=document.createElement("button");el.className="place-pin";el.textContent=p.name;el.setAttribute("aria-label","Vis "+p.name);el.onclick=()=>m.flyTo({center:[p.lon,p.lat],zoom:p.zoom,duration:1200});new gl.Marker({element:el,anchor:"bottom-left"}).setLngLat([p.lon,p.lat]).addTo(m);}
 for(const s of stops){const el=document.createElement("button");el.className="stop-pin";el.title=s.name+" – avganger";el.setAttribute("aria-label",s.name+" – avganger");el.textContent="·";el.onclick=()=>callbacks.current.onStop(s.id);new gl.Marker({element:el}).setLngLat([s.lon,s.lat]).addTo(m);}
 });
 m.on("moveend",()=>{const b=m.getBounds();callbacks.current.onVisible(current.current.filter(v=>b.contains([v.lon,v.lat])).map(v=>v.id));});
 m.on("error",e=>{if(!m.isStyleLoaded()&&e.error?.message?.includes("style"))setFailed(true);});
 resize=new ResizeObserver(()=>m.resize());resize.observe(container.current);
 }).catch(()=>setFailed(true));
 return()=>{cancelled=true;resize?.disconnect();for(const id of rafs.current.values())cancelAnimationFrame(id);rafs.current.clear();positions.current.clear();map.current?.remove();map.current=null;markers.current.clear();};},[]);
 useEffect(()=>{if(!ready||!map.current)return;let cancelled=false;import("maplibre-gl").then(gl=>{if(cancelled||!map.current)return;
 const visible=vehicles.filter(v=>enabled[v.kind]);const ids=new Set(visible.map(v=>v.id));
 for(const [id,m] of markers.current){if(!ids.has(id)){const raf=rafs.current.get(id);if(raf)cancelAnimationFrame(raf);rafs.current.delete(id);positions.current.delete(id);m.remove();markers.current.delete(id);}}
 for(const v of visible){let marker=markers.current.get(v.id);if(!marker){const el=document.createElement("button");el.onclick=()=>{const latest=current.current.find(x=>x.id===v.id);if(latest)callbacks.current.onSelect(latest);};marker=new gl.Marker({element:el,anchor:"center"}).setLngLat([v.lon,v.lat]).addTo(map.current);markers.current.set(v.id,marker);}
 const next:Point=[v.lon,v.lat], previous=positions.current.get(v.id), willMove=!!previous&&!samePoint(previous,next);
 const displayBearing=v.bearing??(previous?bearingBetween(previous,next):0);
 const el=marker.getElement();el.className="maplibregl-marker maplibregl-marker-anchor-center vehicle-pin "+v.kind+(selected===v.id?" selected":"")+(oldPosition(v,now)?" old":"")+(willMove||rafs.current.has(v.id)?" moving":"");
 el.style.setProperty("--vehicle-color",kinds.find(k=>k.id===v.kind)!.color);
 const scale=vehicleSize(v), width=v.kind==="bus"?58:Math.round(22+scale*22), height=v.kind==="bus"?34:Math.round(24+scale*20);
 el.style.setProperty("--vehicle-width",width+"px");el.style.setProperty("--vehicle-height",height+"px");
 el.title=v.name+(v.destination?" → "+v.destination:"");el.setAttribute("aria-label",el.title);el.setAttribute("aria-pressed",String(selected===v.id));
 el.replaceChildren();const glyph=document.createElement("span");glyph.className="vehicle-glyph";glyph.style.transform="rotate("+(v.kind==="bus"?displayBearing-90:displayBearing)+"deg)";
 if(v.kind==="bus"){glyph.innerHTML='<svg viewBox="0 0 76 44" aria-hidden="true"><path class="bus-shadow" d="M9 35h55l7 4-9 3H8l-5-3Z"/><path class="bus-side" d="M8 14c0-4 3-7 7-7h42c6 0 10 4 12 10l3 12H8V14Z"/><path class="bus-roof" d="M15 5h39c6 0 11 4 14 11H11l4-11Z"/><path class="bus-window" d="M16 12h38c5 0 8 2 11 7H16V12Z"/><path class="bus-door" d="M49 20h10v11H49Z"/><path class="bus-front" d="M64 21h7l1 7h-8v-7Z"/><circle class="wheel" cx="20" cy="32" r="5"/><circle class="wheel" cx="58" cy="32" r="5"/><circle class="wheel-cap" cx="20" cy="32" r="2"/><circle class="wheel-cap" cx="58" cy="32" r="2"/></svg>';const label=document.createElement("span");label.className="route-label";label.textContent=v.line||"B";el.appendChild(glyph);el.appendChild(label);}
 else{glyph.innerHTML=v.kind==="ferry"?'<svg viewBox="0 0 72 42" aria-hidden="true"><path class="ship-hull" d="M5 16h50l12 8-8 13H15L5 16Z"/><path class="ship-cabin" d="M20 7h25l6 9H16l4-9Z"/><path class="ship-deck" d="M15 21h40"/></svg>':'<svg viewBox="0 0 72 42" aria-hidden="true"><path class="ship-hull" d="M7 20 36 5l29 15-10 16H17L7 20Z"/><path class="ship-cabin" d="M29 13h14l5 8H24l5-8Z"/><path class="ship-deck" d="M18 23h36"/></svg>';el.appendChild(glyph);}
 if(!previous){positions.current.set(v.id,next);marker.setLngLat(next);}
 else if(!samePoint(previous,next)){const oldRaf=rafs.current.get(v.id);if(oldRaf)cancelAnimationFrame(oldRaf);const start=performance.now(), from=previous, duration=v.kind==="bus"?28000:70000;
  const step=(time:number)=>{const t=Math.min(1,(time-start)/duration), e=smoothStep(t), p:Point=[from[0]+(next[0]-from[0])*e,from[1]+(next[1]-from[1])*e];positions.current.set(v.id,p);marker!.setLngLat(p);if(t<1)rafs.current.set(v.id,requestAnimationFrame(step));else{positions.current.set(v.id,next);rafs.current.delete(v.id);}};
  rafs.current.set(v.id,requestAnimationFrame(step));
 }else marker.setLngLat(next);
 }
 const b=map.current.getBounds();callbacks.current.onVisible(vehicles.filter(v=>b.contains([v.lon,v.lat])).map(v=>v.id));
 });return()=>{cancelled=true;};},[vehicles,enabled,ready,selected,now]);
 return <><div ref={container} className="map-canvas" role="region" aria-label="Interaktivt trafikkart over Nordhordland"/>{!ready&&!failed&&<div className="map-loading"><span className="loading-ring"/>Laster Nordhordland …</div>}{failed&&<div className="map-error"><strong>Kartet kunne ikke lastes</strong><p>Kontroller nettilkoblingen. Trafikklisten og avgangene kan fortsatt brukes.</p><button onClick={()=>window.location.reload()}>Prøv igjen</button></div>}</>;
});


