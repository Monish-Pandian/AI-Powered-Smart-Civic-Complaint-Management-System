import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";

export default function MainLayout({
  children
}) {
  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  return (
    <div className="d-flex min-vh-100">

      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <div className="flex-grow-1 bg-light p-3">

        <Navbar
          setSidebarOpen={setSidebarOpen}
        />

        <div className="mt-4 fade-in">
          {children}
        </div>

      </div>

    </div>
  );
}