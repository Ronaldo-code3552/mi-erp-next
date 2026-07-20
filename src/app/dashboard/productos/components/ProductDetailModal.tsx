"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { productoService } from "@/services/productoService";
import { Producto } from "@/types/producto.types";
import {
    IconBarcode,
    IconBox,
    IconBuildingWarehouse,
    IconCategory,
    IconCurrencyDollar,
    IconLoader2,
    IconPhotoOff,
    IconReceiptTax,
    IconTag,
    IconUser
} from "@tabler/icons-react";
import { toast } from "sonner";

interface Props {
    isOpen: boolean;
    productId: string | null;
    onClose: () => void;
}

const DetailItem = ({ label, value }: { label: string; value?: React.ReactNode }) => (
    <div className="min-w-0 border-b border-slate-100 py-2.5 last:border-b-0">
        <p className="text-[10px] font-bold uppercase text-slate-400">{label}</p>
        <div className="mt-0.5 break-words text-sm font-semibold text-slate-700">{value || "-"}</div>
    </div>
);

export default function ProductDetailModal({ isOpen, productId, onClose }: Props) {
    const [product, setProduct] = useState<Producto | null>(null);
    const [loading, setLoading] = useState(true);
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        if (!isOpen || !productId) return;

        let active = true;

        productoService.getById(productId)
            .then((response) => {
                if (!active) return;
                if (response.isSuccess && response.data) setProduct(response.data);
                else toast.error(response.message || "No se pudo cargar el producto");
            })
            .catch(() => toast.error("No se pudo cargar el detalle del producto"))
            .finally(() => active && setLoading(false));

        return () => { active = false; };
    }, [isOpen, productId]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Detalle del producto" size="xl">
            {loading ? (
                <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 text-blue-600">
                    <IconLoader2 size={36} className="animate-spin" />
                    <p className="text-xs font-semibold text-slate-500">Cargando información del producto...</p>
                </div>
            ) : product ? (
                <div className="space-y-5">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.4fr)]">
                        <div className="flex min-h-[360px] items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-5">
                            {product.imagen && !imageError ? (
                                // Las imágenes de productos pueden provenir de dominios externos no registrados en Next.
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={product.imagen}
                                    alt={product.descripcion}
                                    className="h-full max-h-[430px] w-full object-contain"
                                    onError={() => setImageError(true)}
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-3 text-center text-slate-400">
                                    <IconPhotoOff size={52} stroke={1.4} />
                                    <div>
                                        <p className="text-sm font-bold text-slate-500">Sin imagen disponible</p>
                                        <p className="mt-1 text-xs">El producto no tiene una URL válida registrada.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="min-w-0">
                            <div className="border-b border-slate-200 pb-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${product.estado ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
                                        {product.estado ? "ACTIVO" : "ANULADO"}
                                    </span>
                                    <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700">
                                        {product.condicion_estado || "SIN CONDICIÓN"}
                                    </span>
                                </div>
                                <h2 className="mt-3 text-2xl font-black text-slate-900">{product.descripcion}</h2>
                                <p className="mt-1 text-sm font-semibold text-slate-500">{product.marca || "Sin marca"}</p>
                            </div>

                            <div className="mt-3 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                                <DetailItem label="Código interno" value={<span className="inline-flex items-center gap-1.5"><IconTag size={15} />{product.codigo_existencia}</span>} />
                                <DetailItem label="Código de barras" value={<span className="inline-flex items-center gap-1.5"><IconBarcode size={15} />{product.codigo_barra}</span>} />
                                <DetailItem label="Tipo de bien" value={<span className="inline-flex items-center gap-1.5"><IconBox size={15} />{product.tipoBien?.descripcion}</span>} />
                                <DetailItem label="Clase / Subclase" value={<span className="inline-flex items-center gap-1.5"><IconCategory size={15} />{[product.claseBien?.descripcion, product.subclaseBien?.descripcion || product.subClaseBien?.descripcion].filter(Boolean).join(" / ")}</span>} />
                                <DetailItem label="Unidad de medida" value={`${product.unidadMedida?.descripcion || "-"}${product.unidadMedida?.abreviatura ? ` (${product.unidadMedida.abreviatura})` : ""}`} />
                                <DetailItem label="Código OSCE" value={product.codigo_osce} />
                            </div>

                            <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                                <div className="border-r border-slate-200 p-3">
                                    <p className="text-[10px] font-bold uppercase text-slate-400">Precio</p>
                                    <p className="mt-1 flex items-center gap-1 text-lg font-black text-emerald-700"><IconCurrencyDollar size={18} />S/ {Number(product.precio || 0).toFixed(2)}</p>
                                </div>
                                <div className="border-r border-slate-200 p-3">
                                    <p className="text-[10px] font-bold uppercase text-slate-400">Costo</p>
                                    <p className="mt-1 flex items-center gap-1 text-lg font-black text-slate-700"><IconCurrencyDollar size={18} />S/ {Number(product.costo || 0).toFixed(2)}</p>
                                </div>
                                <div className="p-3">
                                    <p className="text-[10px] font-bold uppercase text-slate-400">Detracción</p>
                                    <p className="mt-1 flex items-center gap-1 text-lg font-black text-amber-700"><IconReceiptTax size={18} />{Number(product.detraccion_porcentaje || 0).toFixed(2)}%</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.5fr_1fr]">
                        <div className="overflow-hidden rounded-lg border border-slate-200">
                            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                                <h3 className="flex items-center gap-2 text-xs font-black uppercase text-slate-700"><IconBuildingWarehouse size={17} />Presentaciones</h3>
                                <span className="text-xs font-bold text-slate-400">{product.presentaciones?.length || 0} registros</span>
                            </div>
                            <div className="max-h-56 overflow-y-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-white text-[10px] uppercase text-slate-400">
                                        <tr><th className="px-4 py-2">Código</th><th className="px-4 py-2">Presentación</th><th className="px-4 py-2 text-right">Factor</th><th className="px-4 py-2 text-center">Estado</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(product.presentaciones || []).map((item) => (
                                            <tr key={item.presentacionId}>
                                                <td className="px-4 py-2.5 font-mono font-bold text-slate-600">{item.presentacionId}</td>
                                                <td className="px-4 py-2.5 font-semibold text-slate-700">{item.descripcion}</td>
                                                <td className="px-4 py-2.5 text-right font-mono">{Number(item.cantidad || 0).toFixed(2)}</td>
                                                <td className="px-4 py-2.5 text-center"><span className={`text-[10px] font-bold ${item.estado ? "text-emerald-600" : "text-rose-600"}`}>{item.estado ? "ACTIVA" : "ANULADA"}</span></td>
                                            </tr>
                                        ))}
                                        {!product.presentaciones?.length && <tr><td colSpan={4} className="px-4 py-8 text-center italic text-slate-400">Sin presentaciones registradas</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="rounded-lg border border-slate-200 px-4">
                            <DetailItem label="Empresa" value={product.empresa?.razon_social} />
                            <DetailItem label="Registrado por" value={<span className="inline-flex items-center gap-1.5"><IconUser size={15} />{product.usuario?.observacion || product.usuario?.usuario}</span>} />
                            <DetailItem label="Observación" value={product.observacion} />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="py-16 text-center text-sm text-slate-400">No se encontró información del producto.</div>
            )}
        </Modal>
    );
}
