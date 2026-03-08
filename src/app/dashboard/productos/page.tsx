// src/app/dashboard/productos/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useCrud } from "@/hooks/useCrud";
import { useDebounce } from "@/hooks/useDebounce";
import { productoService } from "@/services/productoService";
import { useCatalogs } from "@/hooks/useCatalogs"; // <-- NUEVO HOOK IMPORTADO
import { Producto } from "@/types/producto.types";

import DataTable from "@/components/shared/DataTable";
import FiltrosAvanzados from "@/components/filter/FiltrosAvanzados";
import MultiSelect from "@/components/forms/MultiSelect";
import ProductFormModal from "./components/ProductFormModal";
import PresentacionesModal from "./components/PresentacionesModal";

import { 
    IconPlus, IconRefresh, IconSearch, IconFilter, 
    IconEdit, IconTrash, IconBan, IconEye, IconStack2 
} from '@tabler/icons-react';

// Constante para los estados (reemplaza el hardcodeo del SP anterior)
const CONDICION_ESTADO_OPTIONS = [
    { label: 'STOCK', value: 'STOCK' },
    { label: 'LIBRE', value: 'LIBRE' }
];

export default function ProductosPage() {
    const EMPRESA_ID = "005";
    
    const initialFilters = {
        tipo_bien: [],
        sub_clase_bien: [],
        unidad_medida: [],
        detraccion_bien_service: [],
        condicion_estado: []
    };

    const { 
        data, loading, meta, searchTerm, setSearchTerm, 
        filters, setFilters, fetchData, handleAction 
    } = useCrud<Producto>(productoService, EMPRESA_ID, initialFilters);

    const [tempFilters, setTempFilters] = useState<any>(initialFilters);
    const [showFilters, setShowFilters] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [showPresentaciones, setShowPresentaciones] = useState(false);
    const [productToEdit, setProductToEdit] = useState<Producto | null>(null);

    const debouncedSearch = useDebounce(searchTerm, 500);

    // 🚀 MAGIA AQUÍ: Llamamos a los catálogos de forma limpia y cacheadas
    // Usamos los nombres exactos de los Controladores de C#
    const { catalogs, loadingCatalogs } = useCatalogs([
        'TipoBien', 
        'SubClaseBien', 
        'UnidadMedida', 
        'DetraccionBien'
    ]);

    useEffect(() => {
        fetchData(1, debouncedSearch, filters);
    }, [debouncedSearch, filters, fetchData]);

    const handleOpenSidebar = () => {
        setTempFilters(filters);
        setShowFilters(true);
    };

    const handleApplyFilters = () => {
        setFilters(tempFilters);
        setShowFilters(false);
    };

    // DEFINICIÓN DE COLUMNAS (Lógica recuperada de React)
    const columns = [
        { header: 'Código', width: '100px', render: (row: Producto) => <span className="font-mono font-bold text-xs">{row.codigo_existencia || 'S/C'}</span> },
        { 
            header: 'Descripción / Marca', 
            render: (row: Producto) => (
                <div>
                    <p className="font-semibold text-slate-800">{row.descripcion}</p>
                    {row.marca && <span className="text-[10px] text-slate-500 uppercase">Marca: {row.marca}</span>}
                </div>
            )
        },
        { header: 'Precio', className: 'text-right', render: (row: Producto) => <span className="font-mono font-bold text-emerald-600">S/ {row.precio?.toFixed(2)}</span> },
        { 
            header: 'Estado', 
            className: 'text-center',
            render: (row: Producto) => (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${row.estado ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-100'}`}>
                    {row.estado ? 'ACTIVO' : 'ANULADO'}
                </span>
            )
        },
        {
            header: 'Acciones',
            className: 'text-center',
            width: '180px',
            render: (row: Producto) => (
                <div className="flex justify-center gap-1">
                    <button onClick={() => { setProductToEdit(row); setShowForm(true); }} className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded transition-colors" title="Editar">
                        {row.estado ? <IconEdit size={18} /> : <IconEye size={18} />}
                    </button>
                    
                    <button onClick={() => handleAction(row.bienId, 'anular')} disabled={!row.estado} className="p-1.5 hover:bg-orange-50 text-slate-400 hover:text-orange-600 disabled:opacity-30 rounded transition-colors" title="Anular">
                        <IconBan size={18} />
                    </button>
                    
                    <button onClick={() => handleAction(row.bienId, 'delete')} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition-colors" title="Eliminar">
                        <IconTrash size={18} />
                    </button>
                    
                    {/* BOTÓN RECUPERADO DE PRESENTACIONES */}
                    <button 
                        onClick={() => {
                            setProductToEdit(row); 
                            setShowPresentaciones(true); 
                        }} 
                        className="p-1.5 hover:bg-purple-50 text-slate-400 hover:text-purple-600 rounded transition-colors"
                        title="Gestionar Presentaciones"
                    >
                        <IconStack2 size={18} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Inventario de Productos</h1>
                    <p className="text-sm text-slate-500">Gestión completa del catálogo</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => fetchData(meta.currentPage)} className="p-2.5 bg-white border border-slate-300 rounded-lg hover:text-blue-600 transition-colors shadow-sm">
                        <IconRefresh size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button onClick={() => { setProductToEdit(null); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95">
                        <IconPlus size={20} /> Nuevo Producto
                    </button>
                </div>
            </div>

            <div className="flex gap-4 mb-4">
                <div className="relative flex-1">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar por código, descripción o marca..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-500 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button 
                    onClick={handleOpenSidebar}
                    className={`px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all border ${
                        Object.values(filters).flat().length > 0 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white border-slate-300'
                    }`}
                >
                    <IconFilter size={20} /> 
                    Filtros
                </button>
            </div>

            <DataTable columns={columns} data={data} loading={loading} meta={meta} onPageChange={fetchData} />

            <FiltrosAvanzados 
                isOpen={showFilters} 
                onClose={() => setShowFilters(false)}
                onApply={() => { setFilters(tempFilters); setShowFilters(false); }}
                onClear={() => {
                    setTempFilters(initialFilters);
                    setFilters(initialFilters);
                }}
                totalActive={Object.values(tempFilters).flat().length}
            >
                {loadingCatalogs ? (
                    <div className="text-center py-10 text-slate-400 italic text-sm">Cargando catálogos...</div>
                ) : (
                    <div className="flex flex-col gap-5">
                        <MultiSelect 
                            label="Tipo de Bien" 
                            // Ahora usamos catalogs['TipoBien'] que generó el hook
                            options={(catalogs['TipoBien'] || []).map(t => ({ label: t.label, value: t.value }))}
                            value={tempFilters.tipo_bien}
                            onChange={(vals) => setTempFilters({...tempFilters, tipo_bien: vals})}
                        />
                        <MultiSelect 
                            label="SubClase / Categoría" 
                            options={(catalogs['SubClaseBien'] || []).map(t => ({ label: t.label, value: t.value }))}
                            value={tempFilters.sub_clase_bien}
                            onChange={(vals) => setTempFilters({...tempFilters, sub_clase_bien: vals})}
                        />
                        <MultiSelect 
                            label="Unidad de Medida" 
                            // Agregamos el 'aux' (abreviatura) que mapeamos en catalogService
                            options={(catalogs['UnidadMedida'] || []).map(t => ({ label: `${t.label} (${t.aux})`, value: t.value }))}
                            value={tempFilters.unidad_medida}
                            onChange={(vals) => setTempFilters({...tempFilters, unidad_medida: vals})}
                        />
                        <MultiSelect 
                            label="Tipo de Detracción" 
                            options={(catalogs['DetraccionBien'] || []).map(t => ({ label: t.label, value: t.value }))}
                            value={tempFilters.detraccion_bien_service}
                            onChange={(vals) => setTempFilters({...tempFilters, detraccion_bien_service: vals})}
                        />
                        <MultiSelect 
                            label="Condición del Stock" 
                            options={CONDICION_ESTADO_OPTIONS} // Usamos la constante local
                            value={tempFilters.condicion_estado}
                            onChange={(vals) => setTempFilters({...tempFilters, condicion_estado: vals})}
                        />
                    </div>
                )}
            </FiltrosAvanzados>

            {/* Modales */}
            <ProductFormModal 
                isOpen={showForm} 
                onClose={() => setShowForm(false)} 
                productToEdit={productToEdit}
                onSuccess={() => fetchData(meta.currentPage)}
            />

            <PresentacionesModal 
                isOpen={showPresentaciones}
                onClose={() => setShowPresentaciones(false)}
                product={productToEdit}
            />
        </div>
    );
}