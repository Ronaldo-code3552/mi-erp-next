// src/services/catalogService.ts
import apiClient from '../api/apiCliente';
import { SelectOption } from '../types/catalog.types';

// Guardamos la Promesa para evitar llamadas concurrentes (Race Conditions)
const catalogCache = new Map<string, Promise<SelectOption[]>>();

const stableStringify = (value: unknown): string => {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;

    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
};

export const catalogService = {
    getDynamicCatalog: (
        endpointName: string,
        extraParams?: Record<string, unknown>
    ): Promise<SelectOption[]> => {
        const paramsKey = extraParams ? stableStringify(extraParams) : '';
        const cacheKey = `${endpointName}_${paramsKey}`;

        if (catalogCache.has(cacheKey)) {
            return catalogCache.get(cacheKey)!;
        }

        const fetchPromise = (async () => {
            try {
                const queryParams: Record<string, unknown> = { page: 1, ...(extraParams || {}) };
                let fullUrl = `/${endpointName}`;
                const getParamString = (value: unknown): string => String(value ?? '').trim();
                
                // Reglas de ruteo especiales por controlador
                if (endpointName === 'MotivoTraslado') {
                    fullUrl = `/${endpointName}/list`;
                }

                const endpointsPorEmpresa = new Set([
                    'Almacen',
                    'Punto_Venta',
                    'Trabajador',
                    'Transportista',
                    'UnidadTransporte',
                    'ConductorTransporte'
                ]);

                const empresaId = getParamString(queryParams.empresaId);
                if (endpointsPorEmpresa.has(endpointName) && empresaId) {
                    fullUrl = `/${endpointName}/empresa/${empresaId}`;
                    delete queryParams.empresaId;
                }

                const tenantId = getParamString(queryParams.tenantId);
                if (endpointName === 'Proveedor' && tenantId) {
                    fullUrl = `/${endpointName}/tenant/${tenantId}`;
                    delete queryParams.tenantId;
                }
                if (endpointName === 'Cliente' && tenantId) queryParams.tenantId = tenantId;

                // Configuración de parámetros por endpoint (manteniendo comportamiento actual por defecto)
                if (endpointName === 'DocumentoIdentidadXcore') {
                    queryParams.pageSize = 1000;
                    queryParams.estado = true;
                } else if (endpointName === 'Marca' || endpointName === 'Modelo') {
                    queryParams.size = 1000;
                    queryParams.estado = 1;
                } else {
                    queryParams.pageSize = 1000;
                    // 🚀 LA CURA: Excluimos a AlmacenSerie de recibir el "estado=true" por defecto
                    const endpointsSinEstado = new Set(['Cliente', 'Proveedor', 'AlmacenSerie']);
                    
                    if (!endpointsSinEstado.has(endpointName) && !('estado' in queryParams)) {
                        queryParams.estado = true;
                    }
                }

                const response = await apiClient.get(fullUrl, { params: queryParams });
                
                // Soportamos tanto paginados (response.data.data) como listas planas (response.data)
                const rawData = Array.isArray(response.data?.data)
                    ? response.data.data
                    : Array.isArray(response.data)
                    ? response.data
                    : [];

                const formattedData: SelectOption[] = rawData.map((item: Record<string, unknown>, index: number) => {
                    // IDs preferidos por endpoint para evitar colisiones entre catálogos
                    // 1. CAPTURAR EL ID EXACTO
                    const endpointSpecificId =
                        endpointName === 'MotivoTraslado' ? item.motivotrasladoId
                        : endpointName === 'TipoMovimiento' ? item.tipomovimientoId
                        : endpointName === 'TipoDocumentoComercial' ? item.tipodoccomercialId
                        : endpointName === 'CuentaUsuario' ? item.cuentausuarioId
                        : endpointName === 'EstadoGuiasRemision' ? (item.Id || item.id)
                        : endpointName === 'Transportista' ? item.transportistaId
                        : endpointName === 'UnidadTransporte' ? item.unidadtransporteId
                        : endpointName === 'ConductorTransporte' ? item.conductortransporteId
                        : endpointName === 'Almacen' ? item.almacenId
                        : endpointName === 'PuntoVenta' || endpointName === 'Punto_Venta' ? item.puntoventaId
                        : endpointName === 'Trabajador' ? item.trabajadorId
                        : endpointName === 'AlmacenSerie' ? item.serie
                        : endpointName === 'Cliente' ? item.clienteId
                        : endpointName === 'Proveedor' ? item.proveedorId
                        : undefined;

                    // 1. CAPTURAR EL ID EXACTO (Agregamos los de Producto)
                    const extractedId = String(
                        endpointSpecificId ||
                        item.Id ||
                        item.tipobienId || 
                        item.subclasebienId || 
                        item.unidadmedidaId || 
                        item.tipomovimientoId ||
                        item.motivotrasladoId ||
                        item.cuentausuarioId ||
                        item.operacionesItemId || 
                        item.cuenta_contable || 
                        item.detraccionbienserviceId || 
                        item.modeloId || 
                        item.marcaId || 
                        item.docidentId || 
                        item.almacenId ||
                        item.tipodoccomercialId ||
                        item.clienteId ||
                        item.proveedorId ||
                        item.trabajadorId ||
                        item.puntoventaId ||
                        item.transportistaId ||
                        item.unidadtransporteId ||
                        item.conductortransporteId ||
                        item.id || 
                        item.codigo ||
                        item.serie ||
                        `fallback-${index}`
                    ).trim();

                    // 2. CAPTURAR LA DESCRIPCIÓN
                    const extractedDesc =
                        endpointName === 'AlmacenSerie'
                            ? item.serie
                            : item.Descripcion ||
                              item.descripcion_larga ||
                              item.descripcion ||
                              item.razon_social ||
                              item.nombres ||
                              item.nombre ||
                              item.observacion ||
                              'Sin nombre';
                    let finalLabel = String(extractedDesc);
                    if (endpointName === 'UnidadTransporte') {
                        const unidadDesc = String(item.descripcion || item.nombre || extractedDesc || '').trim();
                        const placaCabina = String(item.nro_matricula_cabina || item.nroMatriculaCabina || '').trim();
                        const certInscripcion = String(item.certificado_inscripcion || item.certificadoInscripcion || '').trim();

                        if (placaCabina || certInscripcion) {
                            const refs = [placaCabina, certInscripcion].filter(Boolean).join(' | ');
                            finalLabel = `${unidadDesc} - ${refs}`.trim();
                        }
                    }
                    if (endpointName === 'ConductorTransporte' && item.apellidos) {
                        finalLabel = `${String(item.apellidos || '')}, ${String(item.nombres || '')}`.trim();
                    }

                    // 3. CAPTURAR DATOS AUXILIARES (Ej: Tasa, Abreviatura)
                    const auxValue = String(
                        endpointName === 'AlmacenSerie'
                            ? (item.enviarSunat || '')
                            : item.tasa ||
                              item.abreviatura ||
                              item.descripcion_corta ||
                              item.num_docident ||
                              item.numero_doc ||
                              item.nro_documento ||
                              ''
                    ).trim();

                    // 4. CAPTURAR DEPENDENCIAS (Ej: Subclase depende de Clase)
                    const groupKeyValue = String(
                        endpointName === 'AlmacenSerie'
                            ? item.tipodoccomercialId
                            : item.clasebienId || item.marcaId || item.groupkey || ''
                    ).trim();

                    return {
                        ...item, 
                        value: extractedId,
                        label: finalLabel,
                        key: extractedId, 
                        aux: auxValue,
                        groupKey: groupKeyValue, 
                        originalData: item
                    };
                });

                return formattedData;
            } catch (error) {
                console.error(`Error cargando catálogo ${endpointName}:`, error);
                catalogCache.delete(cacheKey);
                return [];
            }
        })();

        catalogCache.set(cacheKey, fetchPromise);
        return fetchPromise;
    },

    clearCache: () => {
        catalogCache.clear();
    }
};
