"use client"; // <--- OBLIGATORIO: Necesario para saber en qué ruta estamos

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  IconArchive,
  IconClipboardList,
  IconFileArrowLeft,
  IconFileArrowRight,
  IconFileInvoice,
  IconPackageImport,
  IconPackages,
  IconReportAnalytics,
  IconRoute,
  IconSteeringWheel,
  IconTableOptions,
  IconTruck,
  IconTruckDelivery,
  IconBrandWhatsapp,
  IconDashboard,
  IconSend,
  IconListDetails,
  IconMessages,
  IconPhone,
  IconAddressBook,
  IconTemplate,
  IconBuildingStore,
  IconShoppingCart,
  IconReceipt
} from "@tabler/icons-react";

const Sidebar = () => {
  const pathname = usePathname(); // Hook para saber la ruta actual

  // IMPORTANTE: He actualizado los 'path' para que coincidan con tu carpeta 'app/dashboard'
  const menuItems = [
    { title: 'Inventario / Productos', icon: <IconPackages size={20} />, path: '/dashboard/productos' },
    { title: 'Maestro Conductores', icon: <IconSteeringWheel size={20} />, path: '/dashboard/conductores' },
    {
      title: 'Módulo Compras',
      icon: <IconShoppingCart size={20} />,
      path: '/dashboard/orden-compra-servicio',
      children: [
        { title: 'Orden Compra/Servicio', icon: <IconShoppingCart size={17} />, path: '/dashboard/orden-compra-servicio' },
        { title: 'Proveedores', icon: <IconBuildingStore size={17} />, path: '/dashboard/proveedor' },
        { title: 'Documento Comercial', icon: <IconReceipt size={17} />, path: '/dashboard/documento-comercial' },
        { title: 'Reportes', icon: <IconReportAnalytics size={17} />, path: '/dashboard/compras/reportes' }
      ]
    },
    { title: 'Transportistas', icon: <IconTruckDelivery size={20} />, path: '/dashboard/transportistas' },
    { title: 'Unidad Transportistas', icon: <IconTruck size={20} />, path: '/dashboard/unidad-transporte' },
    { title: 'Guias Remision', icon: <IconFileInvoice size={20} />, path: '/dashboard/guias-remision' },
    { title: 'Notas de Entrada', icon: <IconFileArrowLeft size={20} />, path: '/dashboard/notas-ingreso' },
    { title: 'Notas de Salida', icon: <IconFileArrowRight size={20} />, path: '/dashboard/notas-salida' },
    { title: 'Kardex', icon: <IconClipboardList size={20} />, path: '/dashboard/kardex' },
    { title: 'Reportes', icon: <IconReportAnalytics size={20} />, path: '/dashboard/reportes' },
    { title: 'Lotes', icon: <IconArchive size={20} />, path: '/dashboard/lotes' },
    { title: 'Solicitud Reposicion', icon: <IconPackageImport size={20} />, path: '/dashboard/solicitudes-reposicion' },
    { title: 'Motivo Traslado', icon: <IconRoute size={20} />, path: '/dashboard/motivo-traslado' },
    { title: 'Tabla Transaccion', icon: <IconTableOptions size={20} />, path: '/dashboard/tabla-transaccion' },
    {
      title: 'WhatsApp',
      icon: <IconBrandWhatsapp size={20} />,
      path: '/dashboard/whatsapp',
      children: [
        { title: 'Overview', icon: <IconDashboard size={17} />, path: '/dashboard/whatsapp' },
        { title: 'Enviar', icon: <IconSend size={17} />, path: '/dashboard/whatsapp/enviar' },
        { title: 'Logs', icon: <IconListDetails size={17} />, path: '/dashboard/whatsapp/logs' },
        { title: 'Conversaciones', icon: <IconMessages size={17} />, path: '/dashboard/whatsapp/conversaciones' },
        { title: 'Números', icon: <IconPhone size={17} />, path: '/dashboard/whatsapp/numeros' },
        { title: 'Contactos', icon: <IconAddressBook size={17} />, path: '/dashboard/whatsapp/contactos' },
        { title: 'Plantillas', icon: <IconTemplate size={17} />, path: '/dashboard/whatsapp/plantillas' }
      ]
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-screen sticky top-0 flex flex-col hidden md:flex">
      <div className="p-6 border-b border-slate-100 font-bold text-blue-700 text-xl">
          Mi ERP PRO
      </div>
      
      <nav className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {menuItems.map((item) => {
          const children = 'children' in item ? item.children : undefined;
          const isActive = pathname.startsWith(item.path)
            || Boolean(children?.some(child => pathname.startsWith(child.path)));

          return <div key={item.path}>
              <Link href={item.path} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>{item.icon}{item.title}</Link>
              {children && isActive && <div className="ml-5 mt-1 space-y-1 border-l border-slate-200 pl-2">{children.map(child => {
                const childActive = child.path === item.path ? pathname === child.path : pathname.startsWith(child.path);
                return <Link key={child.path} href={child.path} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${childActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'}`}>{child.icon}{child.title}</Link>;
              })}</div>}
          </div>;
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
