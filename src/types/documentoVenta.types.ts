// src/types/Documentoventa.types.ts

// =====================================================
// TIPOS PARA OBJETOS RELACIONADOS (GET responses)
// =====================================================

export interface TipoDocumentoComercial {
  descripcion: string;
  abreviatura: string;
}

export interface Moneda {
  descripcion: string;
  abreviatura: string;
}

export interface ClienteRelacionado {
  descripcion: string;
  numDocIdent: string;
}

export interface Trabajador {
  nombres: string;
  apellidos: string;
  areaId?: string;
}

export interface TipoPago {
  descripcion: string;
  estado: boolean;
}

export interface FormaPago {
  descripcion: string;
  condicionPago: string;
}

export interface CuentaUsuario {
  usuario: string;
  estado: boolean;
}

export interface PuntoVenta {
  descripcion: string;
  sedeId: string;
  serie: string;
}

export interface Sede {
  descripcion: string;
  empresaId: string;
  estado: boolean;
}

export interface Presentacion {
  descripcion: string;
  estado: boolean;
}

export interface Bien {
  descripcion: string;
  codAdmin: string;
}

// =====================================================
// DETALLE DEL DOCUMENTO DE VENTA (GET response)
// =====================================================

export interface DocumentoVentaDetalle {
  item: number;
  bienId: string;
  presentacionId: string;
  cantidad: number;
  precio: number;
  conversionTotal: number;
  importe: number;
  saldoCantidad: number;
  descuentoProducto: number;
  afectoInafecto: boolean;
  saldoTemporal: number;
  precioSinIgv: number;
  porcentajeIgv: number;
  observacion?: string;
  documentoIdEnlazado?: string;
  nombreTablaDocEnlazado?: string;
  cantidadPendienteBoleteo?: number;

  presentacion?: Presentacion;
  bien?: Bien;
}

// =====================================================
// DOCUMENTO DE VENTA PRINCIPAL (GET response)
// =====================================================

export interface DocumentoVenta {
  documentoventaId: string;
  tipodoccomercialId: string;
  pedidoventaId?: string;
  serie: string;
  numero: string;
  fecha_emision: string;
  fecha_doc: string;
  monedaId: string;
  tipo_cambio: number;
  clienteId: string;
  ordencompra_numero?: string;
  ordencompra_foto?: string;
  trabajadorId?: string;
  detraccion: boolean;
  valorventa_afecto: number;
  valorventa_inafecto: number;
  igv: number;
  total: number;
  saldo: number;
  tipopagoId?: string;
  condicion_pago: string;
  fecha_vencimiento?: string;
  puntoventaId: string;
  observacion?: string;
  cotizacionventaId?: string;
  fecha_anulado?: string;
  estado: string;
  cuentausuarioId?: string;
  guiasnotassalidasId?: string;
  total_letras?: string;
  motivoelectronicoId?: string;
  documentoventa_referenciaId?: string;
  valorFirma?: string;
  formaspagoId?: string;
  estado_documento_sunat: string;
  codigo?: string;
  detraccion_porcentaje?: number;
  detraccion_monto?: number;
  asiento_contable?: string;
  identificador_boleteo?: string;
  estado_boleteo?: string;
  valorventa_gratuito?: number;
  operaciongratuita?: boolean;
  tipoopegratuitaId?: string;
  catalogo53Id?: string;
  importe_retencion?: number;
  documento_como_anticipo?: string;
  anticipo_importe?: number;
  estado_almacen?: string;
  codigo_auditoria?: string;

  tipoDocumentoComercial?: TipoDocumentoComercial;
  moneda?: Moneda;
  cliente?: ClienteRelacionado;
  trabajador?: Trabajador;
  tipoPago?: TipoPago;
  formaPago?: FormaPago;
  cuentaUsuario?: CuentaUsuario;
  puntoVenta?: PuntoVenta;
  sede?: Sede;

  detalles?: DocumentoVentaDetalle[];
}

// =====================================================
// FILTROS DE BÚSQUEDA
// =====================================================

export interface FiltrosDocumentoVenta {
  tipodoccomercialIds?: string[];
  monedaIds?: string[];
  condicionPago?: string;
  estadoDocumentoSunat?: string[];
  fechaDesde?: string;
  fechaHasta?: string;
  estado?: string;
}

// =====================================================
// TIPOS PARA FORMULARIOS Y CATÁLOGOS
// =====================================================

export interface KeyValueOption {
  key: string | number;
  value: string;
}

// ============= TIPO RICO PARA BIENES (incluye detracción) =============
export interface BienOption {
  key: string;
  value: string;
  detraccionbienserviceId: string;  // bien_detraccionbienserviceId del SP
  detraccionPorcentaje: number;     // detraccion_porcentaje del SP
}

/**
 * Un ítem de presentación dentro de un grupo agrupado por bien.
 */
export interface PresentacionItem extends KeyValueOption {}

/**
 * Grupo de presentaciones correspondiente a un bienId.
 */
export interface PresentacionGrupo {
  bienId: string;
  items:  PresentacionItem[];
}

/**
 * Siguiente número correlativo por tipodoccomercialId + puntoventaId + serie.
 * Viene precalculado desde el SP al momento de cargar los dropdowns.
 */
export interface SiguienteNumeroItem {
  tipodoccomercialId: string;
  puntoventaId:       string;
  serie:              string;
  siguienteNumero:    string;
}

/**
 * Grupo de series por tipodoccomercialId + puntoventaId.
 */
export interface SerieGrupo {
  tipodoccomercialId: string;
  puntoventaId:       string;
  items:              KeyValueOption[];
}

/**
 * Estructura normalizada de getFormDropdowns().
 */
export interface FormDropdownsDocumentoVenta {
  tipos_documento_comercial: KeyValueOption[];
  monedas:                   KeyValueOption[];
  clientes:                  KeyValueOption[];
  trabajadores:              KeyValueOption[];
  tipos_pago:                KeyValueOption[];
  puntos_venta:              KeyValueOption[];
  condicion_pago:            KeyValueOption[];
  bienes:                    BienOption[];         // ← tipo rico con detracción
  presentaciones:            PresentacionGrupo[];
  series:                    SerieGrupo[];
  siguientes_numeros:        SiguienteNumeroItem[];
}

// =====================================================
// DTO PARA CREAR DOCUMENTO
// =====================================================

export interface CreateDocumentoVentaDTO {
  tipodoccomercialId: string;
  pedidoventaId?: string;
  serie: string;
  numero?: string;
  fechaEmision: string;
  fechaDoc: string;
  monedaId: string;
  tipoCambio: number;
  clienteId: string;
  ordencompraNumero?: string;
  ordencompraFoto?: string;
  trabajadorId?: string;
  detraccion?: boolean;
  valorventaAfecto?: number;
  valorventaInafecto?: number;
  igv?: number;
  total?: number;
  saldo?: number;
  tipopagoId?: string;
  condicionPago: string;
  fechaVencimiento?: string;
  puntoventaId: string;
  observacion?: string;
  cotizacionventaId?: string;
  estado?: string;
  cuentausuarioId?: string;
  guiasnotassalidasId?: string;
  totalLetras?: string;
  motivoelectronicoId?: string;
  documentoventaReferenciaId?: string;
  valorFirma?: string;
  formaspagoId?: string;
  estadoDocumentoSunat?: string;
  codigo?: string;
  detraccionPorcentaje?: number;
  detraccionMonto?: number;
  asientoContable?: string;
  identificadorBoleteo?: string;
  estadoBoleteo?: string;
  valorventaGratuito?: number;
  operacionGratuita?: boolean;
  tipoopegratuitaId?: string;
  catalogo53Id?: string;
  importeRetencion?: number;
  documentoComoAnticipo?: string;
  anticipoImporte?: number;
  estadoAlmacen?: string;

  detalles: CreateDocumentoVentaDetalleDTO[];
}

export interface CreateDocumentoVentaDetalleDTO {
  bienId: string;
  presentacionId: string;
  item?: number;
  cantidad: number;
  precio: number;
  conversionTotal?: number;
  importe?: number;
  saldoCantidad?: number;
  descuentoProducto?: number;
  afectoInafecto?: boolean;
  observacion?: string;
  saldoTemporal?: number;
  precioSinIgv?: number;
  porcentajeIgv?: number;
  documentoIdEnlazado?: string;
  nombreTablaDocEnlazado?: string;
  cantidadPendienteBoleteo?: number;
  // ============= CAMPOS DE DETRACCIÓN =============
  key?: string;                  // detraccionbienserviceId (ej: "000", "005", "035")
  detraccionPorcentaje?: number; // detraccion_porcentaje del bien
}

// =====================================================
// TIPOS PARA RESPUESTAS DE LA API
// =====================================================

export interface DocumentoVentaResponse {
  isSuccess: boolean;
  success?: boolean;
  message: string;
  documentoVentaId?: string;
  data?: any;
}

export interface AnularDocumentoResponse {
  isSuccess: boolean;
  message: string;
  tipoDocumento: string;
  esDocumentoBoleteado?: boolean;
  totalBoletas?: number;
  boletasAnuladas?: number;
  estadoSunat?: string;
  codigoSunat?: string;
  descripcionSunat?: string;
}