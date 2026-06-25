"use client";
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

import { notaIngresoService } from '@/services/notaIngresoService';
import { NotaIngresoResponse } from '@/types/notaIngreso.types';

import {
    IconArrowLeft,
    IconBox,
    IconBuildingStore,
    IconFileDescription,
    IconLoader,
    IconPackage
} from '@tabler/icons-react';

const SectionTitle = ({ title, icon: Icon }: any) => (
    <div className="flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-2 mb-4 mt-6">
        <Icon className="text-blue-600" size={20} />
        <h3 className="font-bold text-sm uppercase tracking-wide">{title}</h3>
    </div>
);

const FormInput = ({ label, className, value, ...props }: any) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">{label}</label>
        <input
            disabled
            className={`w-full border p-2.5 rounded-lg outline-none text-xs bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed font-medium ${className || ''}`}
            value={value !== undefined && value !== null ? value : ''}
            {...props}
        />
    </div>
);

const ReadonlySelect = ({ label, value }: { label: string; value: string }) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">{label}</label>
        <div className="w-full border border-slate-200 p-2.5 rounded-lg text-xs bg-slate-100 text-slate-600 font-medium uppercase truncate">
            {value || '-'}
        </div>
    </div>
);

export default function VerNotaIngresoPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const notaId = String(params?.id || '');

    const [loading, setLoading] = useState(true);
    const [nota, setNota] = useState<NotaIngresoResponse | null>(null);

    useEffect(() => {
        const load = async () => {
            if (!notaId) {
                toast.error('Nota de ingreso inválida.');
                router.push('/dashboard/notas-ingreso');
                return;
            }

            setLoading(true);
            try {
                const res = await notaIngresoService.getById(notaId);
                if (!res?.isSuccess || !res?.data) {
                    toast.error(res?.message || 'No se pudo cargar la nota de ingreso.');
                    router.push('/dashboard/notas-ingreso');
                    return;
                }
                setNota(res.data);
            } catch (error: any) {
                toast.error(error?.message || 'Error al cargar la nota de ingreso.');
                router.push('/dashboard/notas-ingreso');
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [notaId, router]);

    const transaccionRules = useMemo(() => {
        const t = nota?.transaccionId || '';
        return {
            requireContenedor: t === 'CI' || t === 'EI' || t === 'FI',
            requireCosto: t === 'IN',
            allowImportDocs: ['CI', 'CL', 'FI', 'EI', 'TA', 'DV'].includes(t),
        };
    }, [nota?.transaccionId]);

    const entidadLabel = (() => {
        if (nota?.referenciaDocumento?.cliente || nota?.transaccionId === 'DV') return 'Cliente';
        if (nota?.referenciaDocumento?.proveedor) return 'Proveedor';
        if (nota?.referenciaDocumento?.entidad) return nota?.transaccionId === 'DV' ? 'Cliente' : 'Proveedor';
        return 'Cliente / Proveedor';
    })();

    const entidadValue = (() => {
        const fromReferenciaDocumento = String(
            nota?.referenciaDocumento?.entidad?.descripcion ||
            nota?.referenciaDocumento?.cliente?.descripcion ||
            nota?.referenciaDocumento?.proveedor?.descripcion ||
            ''
        ).trim();

        const fromLegacy = String(nota?.proveedor?.descripcion || nota?.cliente?.descripcion || '').trim();
        const fromIdFallback = String(nota?.proveedorId || nota?.clienteId || '').trim();

        return fromReferenciaDocumento || fromLegacy || fromIdFallback || '';
    })();

    const transactionDescription = nota?.tablaTransacciones?.descripcion || nota?.transaccionId || '';
    const documentDescription = nota?.tipoDocumentoComercial?.descripcion || nota?.tipodoccomercialId || '';
    const documentReferenceValue =
        nota?.referenciaDocumento?.documentoReferencia ||
        nota?.doc_referencia_numero ||
        nota?.doc_referencia ||
        '';

    if (loading) {
        return (
            <div className="p-6 max-w-[95%] mx-auto min-h-[60vh] flex items-center justify-center">
                <div className="flex items-center gap-3 text-slate-500 text-sm">
                    <IconLoader className="animate-spin text-blue-600" size={22} />
                    Cargando nota de ingreso...
                </div>
            </div>
        );
    }

    if (!nota) return null;

    return (
        <div className="p-6 max-w-[95%] mx-auto pb-20 animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                        <IconArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Detalle Nota de Ingreso</h1>
                        <p className="text-xs text-slate-500">Visualización de documento {nota.notasingresosId}</p>
                    </div>
                </div>
                <div className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200">
                    {String(nota.estado || '').toUpperCase()}
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <SectionTitle title="Información de Transacción" icon={IconFileDescription} />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className={transaccionRules.allowImportDocs ? "md:col-span-2" : "md:col-span-1"}>
                                <ReadonlySelect
                                    label="Tipo Transacción"
                                    value={transactionDescription}
                                />
                            </div>

                            {transaccionRules.allowImportDocs && (
                                <>
                                    <ReadonlySelect
                                        label="Tipo Documento"
                                        value={documentDescription}
                                    />
                                    <FormInput
                                        label="N° Documento Ref."
                                        value={documentReferenceValue}
                                    />
                                </>
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-4 mt-2">
                            <div className="flex items-center gap-2 text-slate-800">
                                <IconPackage className="text-blue-600" size={20} />
                                <h3 className="font-bold text-sm uppercase tracking-wide">Detalle de Productos</h3>
                            </div>
                        </div>

                        <div className="overflow-visible min-h-[250px]">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                                    <tr>
                                        <th className="p-3 w-8">#</th>
                                        <th className="p-3 w-[32%]">Producto</th>
                                        <th className="p-3 w-28">Presentación</th>
                                        <th className="p-3 w-20 text-right">Cant.</th>
                                        {transaccionRules.requireCosto && (
                                            <>
                                                <th className="p-3 w-24 text-right">Costo</th>
                                                <th className="p-3 w-24 text-right">Importe</th>
                                            </>
                                        )}
                                        <th className="p-3 w-24">Lote</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {!nota.detalles || nota.detalles.length === 0 ? (
                                        <tr>
                                            <td colSpan={transaccionRules.requireCosto ? 7 : 5} className="p-8 text-center text-slate-400 italic">
                                                No hay items registrados.
                                            </td>
                                        </tr>
                                    ) : (
                                        nota.detalles.map((item: any, idx: number) => (
                                            <tr key={`${item.bienId}-${idx}`} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-3 text-center font-mono text-slate-400">{item.item || idx + 1}</td>
                                                <td className="p-3">
                                                    <div className="w-full border border-slate-200 bg-slate-100 p-2 rounded text-slate-600 font-medium uppercase">
                                                        {item.bien?.descripcion || item.bienId || '-'}
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <div className="w-full border border-slate-200 bg-slate-100 p-2 rounded text-slate-600 font-medium uppercase truncate">
                                                        {item.presentacion?.descripcion || item.presentacionId || '-'}
                                                    </div>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <div className="w-full border border-slate-200 bg-slate-100 p-1.5 rounded font-bold text-slate-500">
                                                        {Number(item.cantidad || 0)}
                                                    </div>
                                                </td>
                                                {transaccionRules.requireCosto && (
                                                    <>
                                                        <td className="p-3 text-right">
                                                            <div className="w-full border border-slate-200 bg-slate-100 p-1.5 rounded font-bold text-slate-500">
                                                                {Number(item.costo || 0).toFixed(2)}
                                                            </div>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <div className="w-full border border-slate-200 bg-slate-100 p-1.5 rounded font-bold text-slate-500">
                                                                {Number(item.importe || 0).toFixed(2)}
                                                            </div>
                                                        </td>
                                                    </>
                                                )}
                                                <td className="p-3">
                                                    <div className="w-full border border-slate-200 bg-slate-100 p-2 rounded text-slate-600 font-medium uppercase truncate">
                                                        {item.lote?.descripcion || item.loteId || '-'}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-4 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-4">
                        <SectionTitle title="Entidad y Extras" icon={IconBuildingStore} />
                        <div className="space-y-4">
                            {entidadValue ? (
                                <ReadonlySelect
                                    label={entidadLabel}
                                    value={entidadValue}
                                />
                            ) : null}

                            <ReadonlySelect
                                label="Moneda"
                                value={nota.moneda?.descripcion || nota.monedaId || ''}
                            />

                            <FormInput
                                label="Fecha Sistema"
                                value={nota.fecha_doc ? format(parseISO(nota.fecha_doc), 'dd/MM/yyyy HH:mm') : ''}
                            />

                            <FormInput
                                label="Fecha Emisión"
                                value={nota.fecha_emision ? format(parseISO(nota.fecha_emision), 'dd/MM/yyyy HH:mm') : ''}
                            />

                            <FormInput
                                label="Almacén"
                                value={nota.almacen?.descripcion || nota.almacenId || ''}
                            />

                            {transaccionRules.requireContenedor && (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <FormInput
                                        label="Nro Contenedor"
                                        value={nota.nro_contenedor || ''}
                                        className="border-orange-200 bg-orange-50/40"
                                    />
                                </div>
                            )}

                            <div className="pt-4 border-t border-slate-100">
                                <FormInput
                                    label="Observaciones Generales"
                                    value={nota.observaciones || ''}
                                />
                            </div>
                        </div>

                        <div className="mt-4 bg-slate-50 p-4 rounded-lg border border-slate-100 text-[11px] text-slate-600 leading-relaxed">
                            <div className="flex items-start gap-2">
                                <IconBox size={16} className="text-blue-600 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-bold text-slate-700">Responsable</p>
                                    <p>{nota.cuentaUsuario?.observacion || nota.cuentausuario || '-'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
