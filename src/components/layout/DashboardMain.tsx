export default function DashboardMain({ children }: { children: React.ReactNode }) {
  // Global: ocultamos la barra de scroll del contenedor principal del dashboard para evitar
  // doble scrollbar cuando las tablas (DataTable) ya tienen su propio scroll.
  // El scroll sigue funcionando (mouse wheel/touch), solo ocultamos la "barrita" visual.
  return (
    <main className="flex-1 min-h-0 overflow-y-auto p-4 scrollbar-hidden">
      {children}
    </main>
  );
}
