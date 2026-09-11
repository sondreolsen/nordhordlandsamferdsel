export type Kind = "bus" | "ferry" | "boat" | "ship";
export type Vehicle = {id:string;kind:Kind;name:string;line?:string;route?:string;destination?:string;lat:number;lon:number;bearing:number|null;speed:number|null;updated:string|null;fetched:string;source:"Entur"|"AIS";delay:number|null};
export type Feed = {vehicles:Vehicle[];fetched:string;partial:boolean;status:"ok"|"error";message?:string};
export const kinds: {id:Kind;name:string;description:string;color:string}[]=[
{id:"bus",name:"Busser",description:"Skyss i Nordhordland",color:"#f9b855"},
{id:"ferry",name:"Ferger",description:"Bilferger i området",color:"#74c6ff"},
{id:"boat",name:"Båter",description:"Hurtigbåter og mindre båter",color:"#b9a3ff"},
{id:"ship",name:"Skip",description:"Last, fiske og øvrige fartøy",color:"#78dcc5"}];
export const places=[
{name:"Knarvik",lon:5.2875,lat:60.5467,zoom:13},
{name:"Frekhaug",lon:5.2425,lat:60.5187,zoom:13},
{name:"Manger",lon:5.043,lat:60.641,zoom:12},
{name:"Austrheim",lon:4.936,lat:60.784,zoom:11},
{name:"Hordvik",lon:5.3131,lat:60.517,zoom:13},
{name:"Salhus",lon:5.2672,lat:60.507,zoom:13}];
export const stops=[
{id:"NSR:StopPlace:32632",name:"Knarvik terminal",lon:5.287526,lat:60.546743},
{id:"NSR:StopPlace:59246",name:"Knarvik kai",lon:5.287074,lat:60.541907},
{id:"NSR:StopPlace:59411",name:"Frekhaug kai",lon:5.248595,lat:60.517745},
{id:"NSR:StopPlace:32465",name:"Manger senter",lon:5.042637,lat:60.640385},
{id:"NSR:StopPlace:33412",name:"Mastrevik torg",lon:4.931273,lat:60.784032},
{id:"NSR:StopPlace:28949",name:"Hordvik",lon:5.313128,lat:60.516974},
{id:"NSR:StopPlace:31265",name:"Salhus kai",lon:5.267249,lat:60.50696},
{id:"NSR:StopPlace:58475",name:"Leirvågen ferjekai",lon:5.004903,lat:60.814519},
{id:"NSR:StopPlace:58474",name:"Sævrøyna ferjekai",lon:4.830771,lat:60.788703}
];
export function inRegion(lat:number,lon:number){return Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=60.48&&lat<=60.88&&lon>=4.72&&lon<=5.4;}
export function oldPosition(v:Vehicle,now:number){return v.updated ? now-Date.parse(v.updated)>600000 : false;}
export function time(value:string|null){return value&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleTimeString("nb-NO",{hour:"2-digit",minute:"2-digit",timeZone:"Europe/Oslo"}):"Ukjent";}
export function age(value:string|null,now:number){if(!value)return "Posisjonstid ukjent";const minutes=Math.max(0,Math.floor((now-Date.parse(value))/60000));return minutes<1?"Oppdatert nå":minutes<60?minutes+" min siden":Math.floor(minutes/60)+" t "+minutes%60+" min siden";}

