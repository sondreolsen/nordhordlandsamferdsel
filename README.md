# Nordhordland – på sjø og land

Interaktivt trafikkart i React, MapLibre GL JS og Vinext, med en Cloudflare Worker for åpne datakilder.

## Lokal kjøring

Node.js 22.13 eller nyere og npm er nødvendig.

- Installer med `npm run install:ci`.
- Start med `npm run dev` (port 5173).
- Bygg med `npm run build`.
- Kontroller typer med `npx tsc --noEmit`.
- Produksjonsvisning: `npm start -- --port 5173`.

## Datakilder

- Busser: Entur Vehicle Positions v2, codespace SKY, avgrenset til 60.48–60.88 N og 4.72–5.40 E. Deduppliseres etter kjøretøy-ID og nyeste posisjon. Oppdateres hvert 30. sekund.
- Skip og båter: BarentsWatch/Kystverket via Allemannsdata. Tre overlappende områdesøk, deduplisering etter MMSI og fem minutters cache. Kildens begrensede eller delvise svar merkes.
- Ferger: kjente bilferger Storfjord og Fedjebjørn. Kilde: Fjord1s fartøyliste og Skyss' samband Fedje–Sævrøy. Andre passasjerfartøy klassifiseres som Båter etter AIS-type; reserveferger kan derfor havne der.
- Avganger: Entur via Allemannsdata, verifiserte StopPlace-ID-er for ni holdeplasser/kaier. Sanntid og rutetid vises separat.
- Kart: OpenFreeMap Liberty / OpenMapTiles / OpenStreetMap, med egen fargepalett. Terreng: Mapterhorn, Terrarium.

Hentetid er ikke posisjonstid. Manglende AIS-tidsstempel vises som ukjent. Bussposisjoner eldre enn ti minutter vises dempet. Det brukes ingen simulerte kjøretøyposisjoner. Ved kildefeil beholdes sist mottatte data i klienten med tydelig varsel. Kartet er ikke et navigasjonskart.

## Verifikasjon

Typekontroll, produksjonsbygg, API-svar og visuell kontroll av kart, filtre, steder, 3D og avganger. Nettverket er nødvendig for kartfliser og trafikkdata. Ingen API-nøkler trengs for nåværende kilder.
