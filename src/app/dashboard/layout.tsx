import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import DashboardMain from "@/components/layout/DashboardMain";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-left">
      {/* El Sidebar se mantiene estático aquí */}
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* El Navbar se mantiene estático aquí */}
        <Navbar />
        
        {/* "children" es el equivalente a <Outlet /> de React */}
        <DashboardMain>{children}</DashboardMain>
      </div>
    </div>
  );
}
