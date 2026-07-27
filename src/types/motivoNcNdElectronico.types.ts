export const TIPO_DOCUMENTO_NOTA = {
    NC: "NC",
    ND: "ND"
} as const;

export type TipoDocumentoNota =
    typeof TIPO_DOCUMENTO_NOTA[
        keyof typeof TIPO_DOCUMENTO_NOTA
    ];

export interface MotivoNcNdElectronico {
    motivoElectronicoId: string;
    tipoDocumento: TipoDocumentoNota;
    concepto: string;
}

export interface MotivoNcNdElectronicoFilter {
    pageNumber?: number;
    pageSize?: number;
    searchTerm?: string;
    tipoDocumento: TipoDocumentoNota;
}
