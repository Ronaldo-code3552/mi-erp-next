// src/hooks/useCrud.ts
"use client";
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { ApiResponse } from '@/types';

// contextId puede ser empresaId o almacenId dependiendo de la pantalla
export function useCrud<T>(
  service: any, 
  contextId: string | null | undefined, 
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

      if (contextId) {
        // 🚀 EVOLUCIÓN: Detectar inteligentemente el método del servicio
        if (typeof service.getByAlmacen === 'function') {
            // CASO C: Entidades dependientes de un almacén (Ej: Notas de Ingreso)
            response = await service.getByAlmacen(contextId, page, 20, term, activeFilters);
        } else if (typeof service.getByEmpresa === 'function') {
            // CASO A: Entidades dependientes de una empresa (Ej: Productos, Conductores)
            response = await service.getByEmpresa(contextId, page, 20, term, activeFilters);
        } else {
            throw new Error("El servicio no implementa getByEmpresa ni getByAlmacen");
        }
      } else {
        // CASO B: Entidades globales (Motivos, Tablas Maestras)
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
  }, [service, contextId, searchTerm, filters]);

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