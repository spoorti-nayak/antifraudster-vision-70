import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";

const DashboardLayout = () => {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 p-8 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;