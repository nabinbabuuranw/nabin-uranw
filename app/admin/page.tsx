import type { Metadata } from "next";
import { AdminApp } from "@/components/admin/AdminApp";

export const metadata: Metadata = { title: "Requests dashboard", robots: { index: false, follow: false }, alternates: { canonical: "/admin" } };

export default function AdminPage() {
  return <AdminApp />;
}
