// src/services/documentoVentaService.ts

import apiClient from '../api/apiCliente';
import type {
  DocumentoVenta,
  FiltrosDocumentoVenta,
  FormDropdownsDocumentoVenta,
  CreateDocumentoVentaDTO,
  DocumentoVentaResponse,
  AnularDocumentoResponse,
  BienOption,
} from '@/types/documentoVenta.types';

const buildFiltersString = (filtros: FiltrosDocumentoVenta | null | undefined): string | null => {
    if (!filtros) return null;

    const cleaned: any = {};
    let hasData = false;

    Object.keys(filtros).forEach(key => {
        // Ignoramos estos booleanos aquí para no enviarlos dentro del JSON
        if (key === 'RequiereSaldoPendiente' || key === 'SoloNotasCreditoPendientes') return;

        const value = (filtros as any)[key];
        if (value !== undefined && value !== null && value !== '') {
            if (Array.isArray(value)) {
                if (value.length > 0) {
                    cleaned[key] = value;
                    hasData = true;
                }
            } else {
                cleaned[key] = value;
                hasData = true;
            }
        }
    });

    return hasData ? JSON.stringify(cleaned) : null;
};

class DocumentoVentaService {
  private readonly baseURL = '/DocumentoVenta';

  private normalizeResponsePayload(payload: any) {
    if (typeof payload !== 'string') return payload;

    const trimmedPayload = payload.trim();
    if (!trimmedPayload) return payload;

    try {
      return JSON.parse(trimmedPayload);
    } catch {
      return payload;
    }
  }

  private unwrapResponseValue(payload: any) {
    const normalizedPayload = this.normalizeResponsePayload(payload);
    return normalizedPayload?.value ?? normalizedPayload;
  }

  async getAll(empresaId: string, page = 1, pageSize = 20, search?: string, filters?: FiltrosDocumentoVenta, soloStock: boolean = false) {
    return this.getByEmpresa(empresaId, page, pageSize, search, filters, soloStock);
  }

  // 🚀 1. VENTAS NORMALES
  async getByEmpresa(empresaId: string, page = 1, pageSize = 20, search?: string, filters?: FiltrosDocumentoVenta, soloStock: boolean = false) {
    try {
      const filtersToSend = buildFiltersString(filters);
      const requiereSaldoPendiente = filters?.RequiereSaldoPendiente ?? false;
      const esSalidaConsignacion = filters?.EsSalidaConsignacion ?? false;

      const params = { 
          page, 
          pageSize, 
          search, 
          filters: filtersToSend, 
          soloStock,
          requiereSaldoPendiente,
          esSalidaConsignacion // 🚀 LO ENVIAMOS AL C#
      };

      const response = await apiClient.get(`${this.baseURL}/empresa/${empresaId}`, { params });
      const apiResponse = this.unwrapResponseValue(response.data);

      return {
        data: apiResponse.data || [],
        meta: apiResponse.meta || { totalRecords: 0, totalPages: 1, currentPage: page, pageSize }
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al cargar los documentos de venta');
    }
  }

  // 🚀 2. BONIFICACIONES (NUEVO ENDPOINT)
  async getBonificacionesByEmpresa(empresaId: string, page = 1, pageSize = 20, search?: string, filters?: FiltrosDocumentoVenta, soloStock: boolean = false) {
    try {
      const filtersToSend = buildFiltersString(filters);
      const requiereSaldoPendiente = filters?.RequiereSaldoPendiente ?? false;

      const params = { 
          page, 
          pageSize, 
          search, 
          filters: filtersToSend, 
          soloStock,
          requiereSaldoPendiente // 🚀 Pasamos el nuevo Query Param
      };

      const response = await apiClient.get(`${this.baseURL}/empresa/${empresaId}/bonificaciones`, { params });
      const apiResponse = this.unwrapResponseValue(response.data);

      return {
        data: apiResponse.data || [],
        meta: apiResponse.meta || { totalRecords: 0, totalPages: 1, currentPage: page, pageSize }
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al cargar las bonificaciones');
    }
  }

  // 🚀 3. NOTAS DE CRÉDITO PENDIENTES
  async getNotasCreditoPendientes(
    empresaId: string,
    page: number = 1,
    pageSize: number = 20,
    search: string = "",
    filters: FiltrosDocumentoVenta | null = null,
    soloStock: boolean = false
  ) {
    try {
      const filtersToSend = buildFiltersString(filters);
      
      const response = await apiClient.get(`${this.baseURL}/empresa/${empresaId}/notas-credito-pendientes`, { 
        params: {
          page,
          pageSize,
          search,
          filters: filtersToSend,
          soloStock
        }
      });

      const payload = this.unwrapResponseValue(response.data);
      return {
        ...payload,
        data: payload?.data || [],
        meta: payload?.meta || { totalRecords: 0, totalPages: 1, currentPage: page, pageSize }
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al cargar notas de crédito pendientes');
    }
  }

  async getById(documentoventaId: string): Promise<DocumentoVenta> {
    try {
      const safeId = documentoventaId?.trim();
      if (!safeId) throw new Error('El ID del documento de venta es requerido');

      const response = await apiClient.get(`${this.baseURL}/${safeId}`);
      const payload = this.normalizeResponsePayload(response.data);

      if (payload && typeof payload === 'object' && 'isSuccess' in payload && !payload.isSuccess) {
        throw new Error(payload.message || 'No se pudo obtener el documento de venta');
      }

      const normalizedData = this.normalizeResponsePayload(payload?.data ?? payload);

      return normalizedData;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al cargar el documento de venta');
    }
  }
  async create(documento: CreateDocumentoVentaDTO): Promise<DocumentoVentaResponse> {
    try {
      const response = await apiClient.post(this.baseURL, documento);
      return response.data;
    } catch (error: any) {
      console.error('Error al crear documento de venta:', error);
      throw new Error(error.response?.data?.message || 'Error al crear el documento de venta');
    }
  }

  async createConValidacionSunat(documento: CreateDocumentoVentaDTO): Promise<DocumentoVentaResponse> {
    try {
      const response = await apiClient.post(`${this.baseURL}/DV_EnvioSunat`, documento);
      return response.data;
    } catch (error: any) {
      console.error('Error al crear documento de venta con validación SUNAT:', error);
      throw new Error(error.response?.data?.message || 'Error al crear y validar el documento en SUNAT');
    }
  }

  async update(documentoventaId: string, documento: Partial<DocumentoVenta>): Promise<DocumentoVentaResponse> {
    try {
      const response = await apiClient.put(`${this.baseURL}/${documentoventaId}`, documento);
      return response.data;
    } catch (error: any) {
      console.error('Error al actualizar documento de venta:', error);
      throw new Error(error.response?.data?.message || 'Error al actualizar el documento de venta');
    }
  }

  async anular(documentoventaId: string, empresaId?: string): Promise<AnularDocumentoResponse> {
    try {
      const response = await apiClient.patch(`${this.baseURL}/${documentoventaId}/anular`);
      return response.data;
    } catch (error: any) {
      console.error('Error al anular documento de venta:', error);
      throw new Error(error.response?.data?.message || 'Error al anular el documento de venta');
    }
  }

  async delete(documentoventaId: string): Promise<any> {
    try {
      const response = await apiClient.delete(`${this.baseURL}/${documentoventaId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error al eliminar documento de venta:', error);
      throw new Error(error.response?.data?.message || 'Error al eliminar el documento de venta');
    }
  }

  async getSeriesBoleteo(puntoventaId: string, tipodoccomercialId: string): Promise<any[]> {
    try {
      const response = await apiClient.get(`${this.baseURL}/seriesBoleteo`, {
        params: { puntoventaId, tipodoccomercialId }
      });
      return response.data.data || response.data;
    } catch (error: any) {
      console.error('Error al obtener series de boleteo:', error);
      throw new Error(error.response?.data?.message || 'Error al cargar series de boleteo');
    }
  }

  async asociarBoletas(documentoInternoId: string, boletasIds: string[]): Promise<any> {
    try {
      const response = await apiClient.post(
        `${this.baseURL}/${documentoInternoId}/asociar-boletas`,
        { boletasIds }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error al asociar boletas:', error);
      throw new Error(error.response?.data?.message || 'Error al asociar boletas al documento interno');
    }
  }

  async convertirInternoAFactura(
    documentoInternoId: string,
    serie: string,
    numero: string,
    cuentaUsuarioId?: string
  ): Promise<any> {
    try {
      const response = await apiClient.post(`${this.baseURL}/convertir-interno-a-factura`, null, {
        params: { documentoInternoId, serie, numero, cuentaUsuarioId }
      });
      return response.data;
    } catch (error: any) {
      console.error('Error al convertir documento interno a factura:', error);
      throw new Error(error.response?.data?.message || 'Error al convertir documento interno a factura');
    }
  }

  async getReporteImportacionContable(
    empresaId: string,
    fechaIni: string,
    fechaFin: string,
    asientoContable: number = 1
  ): Promise<any[]> {
    try {
      const response = await apiClient.get(`${this.baseURL}/reporte-importacion-contable`, {
        params: { empresaId, fecha_ini: fechaIni, fecha_fin: fechaFin, asiento_contable: asientoContable }
      });
      return response.data.data || response.data;
    } catch (error: any) {
      console.error('Error al obtener reporte de importación contable:', error);
      throw new Error(error.response?.data?.message || 'Error al generar reporte contable');
    }
  }

  /**
   * Obtiene los catálogos para los dropdowns del formulario.
   * GET /api/DocumentoVenta/form-dropdowns?empresaId=...&tenantId=...
   *
   * El SP ahora devuelve en "bien" los campos:
   *   key, value, detraccionbienserviceId, detraccionPorcentaje
   */
  async getFormDropdowns(
    empresaId: string,
    tenantId: string
  ): Promise<FormDropdownsDocumentoVenta> {
    try {
      const response = await apiClient.get(`${this.baseURL}/form-dropdowns`, {
        params: { empresaId, tenantId }
      });

      const raw = response.data?.data ?? response.data;

      return {
        tipos_documento_comercial: raw.tipo_doc_comercial ?? [],
        monedas:                   raw.moneda             ?? [],
        clientes:                  raw.cliente            ?? [],
        trabajadores:              raw.trabajador         ?? [],
        tipos_pago:                raw.tipo_pago          ?? [],
        puntos_venta:              raw.punto_venta        ?? [],
        condicion_pago:            raw.condicion_pago     ?? [],
        // "bien" ahora incluye detraccionbienserviceId y detraccionPorcentaje
        bienes:                    (raw.bien ?? []) as BienOption[],
        presentaciones:            raw.presentacion       ?? [],
        series:                    raw.serie              ?? [],
        siguientes_numeros:        raw.siguiente_numero   ?? [],
      };
    } catch (error: any) {
      console.error('Error al obtener catálogos del formulario:', error);
      throw new Error('Error al cargar opciones del formulario');
    }
  }

  getBienDetraccionInfo(
    bienes: BienOption[],
    bienId: string
  ): { key: string; detraccionPorcentaje: number } {
    const bien = bienes.find(b => b.key === bienId);
    return {
      key: bien?.detraccionbienserviceId ?? '000',
      detraccionPorcentaje: bien?.detraccionPorcentaje ?? 0,
    };
  }
}

const documentoVentaService = new DocumentoVentaService();
export default documentoVentaService;
export { DocumentoVentaService };
