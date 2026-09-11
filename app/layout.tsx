import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {title:"Nordhordland – på sjø og land", description:"Busser, ferger, båter og skip i Nordhordland. Fra Salhus og Hordvik til Knarvik, Frekhaug, Manger og Austrheim.",icons:{icon:"/favicon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="nb"><body>{children}</body></html>}
