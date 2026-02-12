"use client";
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { ApiResponse } from '@/types';

// Cambio 1: empresaId ahora acepta string, null o undefined
export function useCrud<T>(
  service: any, 
  empresaId: string | null | undefined, 
  initialFilters: any = {}
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState({ totalPages: 0, currentPage: 1, totalRecords: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState(initialFilters);

  const fetchData = useCallback(async (page = 1, term = searchTerm, activeFilters = filters) => {
    setLoading(true);
    try {
      let response: ApiResponse<T[]>;

      // Cambio 2: Lógica condicional para llamar al servicio
      if (empresaId) {
        // CASO A: Entidades dependientes de una empresa (Productos, Conductores)
        // Firma: (empresaId, page, pageSize, term, filters)
        response = await service.getByEmpresa(empresaId, page, 20, term, activeFilters);
      } else {
        // CASO B: Entidades globales (Motivos, Tablas Maestras)
        // Intentamos llamar a 'getAll' si existe, sino 'getByEmpresa' pero sin el ID
        // Firma: (page, pageSize, term, filters)
        const method = service.getAll ? service.getAll : service.getByEmpresa;
        response = await method(page, 20, term, activeFilters);
      }

      if (response.isSuccess) {
        setData(response.data);
        setMeta(response.meta || { totalPages: 0, currentPage: 1, totalRecords: 0 });
      } else {
        setData([]);
        toast.error(response.message || "Error al cargar datos");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error de conexión con la WebAPI");
    } finally {
      setLoading(false);
    }
  }, [service, empresaId, searchTerm, filters]);

  const handleAction = async (id: string | number, actionType: 'delete' | 'anular' = 'delete') => {
    const isDelete = actionType === 'delete';
    const result = await Swal.fire({
      title: isDelete ? '¿Eliminar registro?' : '¿Anular registro?',
      text: "Esta acción no se puede deshacer",
      icon: isDelete ? 'error' : 'warning',
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      confirmButtonColor: isDelete ? '#ef4444' : '#f59e0b',
    });

    if (result.isConfirmed) {
      try {
        const res = isDelete ? await service.delete(id) : await service.anular(id);
        if (res.isSuccess) {
          toast.success("Operación exitosa");
          fetchData(meta.currentPage);
        } else {
          toast.error(res.message);
        }
      } catch (error) {
        toast.error("Error al procesar solicitud");
      }
    }
  };

  return { data, loading, meta, searchTerm, setSearchTerm, filters, setFilters, fetchData, handleAction };
}