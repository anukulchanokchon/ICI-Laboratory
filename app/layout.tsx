import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "LabTrace — Laboratory Management", description: "ระบบยืมคืนอุปกรณ์และจัดการสารเคมีในห้องปฏิบัติการ", icons: { icon: "/favicon.svg" } };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="th"><body>{children}</body></html>}
