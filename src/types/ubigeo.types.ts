export type UbigeoNivel = 'pais' | 'departamento' | 'provincia' | 'distrito';

export interface Ubigeo {
    key?: string;
    value?: string;
    ubipai?: string;
    ubipan?: string;
    ubidep?: string;
    ubiden?: string;
    ubiprv?: string;
    ubiprn?: string;
    ubidst?: string;
    ubidsn?: string;
    nacionalidad?: string;
    estado?: string;
}

export interface UbigeoCascadeParams {
    nivel: UbigeoNivel;
    ubipan?: string;
    ubiden?: string;
    ubiprn?: string;
}
