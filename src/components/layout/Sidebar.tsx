"use client"; // <--- OBLIGATORIO: Necesario para saber en qué ruta estamos

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  IconPackage, 
  IconUsers, 
  IconTruck, 
  IconActivity,
  Icon24Hours,
  IconAdjustmentsCode
} from "@tabler/icons-react";

const Sidebar = () => {
  const pathname = usePathname(); // Hook para saber la ruta actual

  // IMPORTANTE: He actualizado los 'path' para que coincidan con tu carpeta 'app/dashboard'
  const menuItems = [
    { title: 'Inventario / Productos', icon: <IconPackage size={20} />, path: '/dashboard/productos' },
    { title: 'Maestro Conductores', icon: <IconUsers size={20} />, path: '/dashboard/conductores' },
    { title: 'Transportistas', icon: <IconTruck size={20} />, path: '/dashboard/transportistas' },
    { title: 'Unidad Transportistas', icon: <IconTruck size={20} />, path: '/dashboard/unidad-transporte' }, // Ojo: verifica si tu carpeta se llama 'unidadtrasportistas' o 'unidad-transporte', puse la del tree que me diste.
    {title: 'Guias Remision', icon: <IconActivity size={20} />, path: '/dashboard/guias-remision' },
    {title: 'Motivo Traslado', icon: <Icon24Hours size={20} />, path: '/dashboard/motivo-traslado' },
    {title: 'Tabla Transaccion', icon: <IconAdjustmentsCode size={20} />, path: '/dashboard/tabla-transaccion' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-screen sticky top-0 flex flex-col hidden md:flex">
      <div className="p-6 border-b border-slate-100 font-bold text-blue-700 text-xl">
          Mi ERP PRO
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          // Lógica para saber si el item está activo
          const isActive = pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                isActive 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              {item.icon}
              {item.title}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;