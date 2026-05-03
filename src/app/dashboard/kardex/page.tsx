"use client";
import { useMemo, useState } from 'react';
import { IconSearch, IconFileSpreadsheet, IconPackage, IconDatabase, IconX } from '@tabler/icons-react';
import { toast } from 'sonner';

// Componentes propios
import SearchableSelect from '@/components/forms/SearchableSelect';
import KardexDataTable from '@/components/kardex/KardexDataTable';
import { columnsKardexPres, columnsKardexGral } from '@/components/kardex/KardexGrid';
import { useCatalogs } from '@/hooks/useCatalogs';
import { getAlmacenesActivosOrdenados } from '@/utils/almacenOptions';

// Servicios
import { kardexService } from '@/services/kardexService';
import { productoService } from '@/services/productoService';
import { presentacionService } from '@/services/presentacionService';
import { almacenLoteService } from '@/services/almacenLoteService';

// Tipos
import { MovimientoInventarioDto, MovimientoEmpresaDto } from '@/types/kardex.types';

type SelectOption = {
    key?: string | number;
    value: string | number;
    label?: string;
    aux?: string | number;
    raw?: unknown;
};

type SelectChange = {
    target: { name?: string; value: string | number };
    option?: SelectOption;
};

type PresentacionApi = {
    presentacionId?: string | number;
    descripcion?: string;
    unidadmedidaId?: string;
    cantidad?: string | number;
};

type ProductoApi = {
    bienId?: string | number;
    descripcion?: string;
    codigo_existencia?: string | number;
};

type LoteApi = {
    loteId?: string | number;
    descripcion?: string;
    codigo_lote_importacion?: string;
    stock_disponible?: string | number;
};

export default function KardexPage() {
    // --- ESTADOS ---
    const [activeTab, setActiveTab] = useState<1 | 3>(1); // 1: Presentación, 3: General
    const [loading, setLoading] = useState(false);
    
    // Tipado union para soportar ambas tablas
    const [movimientos, setMovimientos] = useState<Array<MovimientoInventarioDto | MovimientoEmpresaDto>>([]);
    const [saldos, setSaldos] = useState({ real: 0, disponible: 0, futuro: 0 });

    // IDS Temporales (A futuro: venir de tu contexto de sesión)
    const ALMACEN_ID = '001';
    const EMPRESA_ID = '005';

    // --- FILTROS ---
    const [filtros, setFiltros] = useState({
        fechaInicial: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        fechaFinal: new Date().toISOString().split('T')[0],
        bienId: '',
        presentacionId: '',
        lote: '',
        almacenId: ALMACEN_ID,
        empresaId: EMPRESA_ID,
        agrupamiento: 'MENSUAL'
    });

    // Labels para selects
    const [bienLabel, setBienLabel] = useState('');
    const [presLabel, setPresLabel] = useState('');
    const [loteLabel, setLoteLabel] = useState('');
    const [presentacionOptions, setPresentacionOptions] = useState<SelectOption[]>([]);

    const { catalogs, loadingCatalogs } = useCatalogs([
        { endpoint: 'Almacen', params: { empresaId: EMPRESA_ID } }
    ]);

    const almacenOptions = useMemo(() => {
        return getAlmacenesActivosOrdenados(catalogs['Almacen'] || []);
    }, [catalogs]);

    // --- LÓGICA DE EVENTOS ---
    const handleBienChange = async (e: SelectChange) => {
        const bienId = String(e?.target?.value || '').trim();
        const opt = e?.option;

        setFiltros(prev => ({ ...prev, bienId, presentacionId: '', lote: '' }));
        setBienLabel(opt?.label || '');
        setPresLabel('');
        setLoteLabel('');
        setPresentacionOptions([]);
        setSaldos({ real: 0, disponible: 0, futuro: 0 }); // Limpiar saldos

        if (!bienId) return;

        try {
            const res = await presentacionService.getByBien(bienId, true);
            const mapped = ((res?.data || []) as PresentacionApi[]).map((p) => ({
                key: String(p.presentacionId).trim(),
                value: String(p.presentacionId).trim(),
                label: String(p.descripcion || p.unidadmedidaId).trim(),
                aux: Number(p.cantidad || 0)
            })).sort((a, b) => Number(a.aux || 0) - Number(b.aux || 0));

            setPresentacionOptions(mapped);
            if (mapped.length > 0) {
                setFiltros(prev => ({ ...prev, presentacionId: String(mapped[0].value) }));
                setPresLabel(mapped[0].label || '');
            }
        } catch {
            toast.error('Error al cargar presentaciones.');
        }
    };

    const handlePresentacionChange = (e: SelectChange) => {
        setFiltros(prev => ({ ...prev, presentacionId: String(e.target.value || ''), lote: '' }));
        setPresLabel(e.option?.label || '');
        setLoteLabel('');
    };

    const handleLoteChange = (e: SelectChange) => {
        setFiltros(prev => ({ ...prev, lote: String(e.target.value || '') }));
        setLoteLabel(e.option?.label || String(e.target.value || ''));
    };

    const handleAlmacenChange = (e: SelectChange) => {
        const almacenId = String(e.target.value || '').trim();
        setFiltros(prev => ({ ...prev, almacenId, lote: '' }));
        setLoteLabel('');
        setMovimientos([]);
        setSaldos({ real: 0, disponible: 0, futuro: 0 });
    };

    const fetchLotes = async (term: string) => {
        if (!filtros.almacenId || !filtros.presentacionId) return [];

        const res = await almacenLoteService.getByAlmacenYPresentacion(
            filtros.almacenId,
            filtros.presentacionId,
            1,
            30,
            { SearchTerm: term }
        );

        if (!res.isSuccess) return [];

        return ((res.data || []) as LoteApi[]).map((l) => ({
            key: String(l.loteId || '').trim(),
            value: String(l.loteId || '').trim(),
            label: String(l.descripcion || l.loteId || '').trim(),
            aux: [
                l.codigo_lote_importacion ? `Cod: ${l.codigo_lote_importacion}` : '',
                l.stock_disponible !== undefined ? `Stock: ${Number(l.stock_disponible || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}` : ''
            ].filter(Boolean).join(' | '),
            raw: l
        }));
    };

    const handleBuscar = async () => {
        if (!filtros.bienId) return toast.error('Seleccione un producto (Bien).');
        if (activeTab === 1 && !filtros.almacenId) return toast.error('Seleccione un almacén.');
        if (activeTab === 1 && !filtros.presentacionId) return toast.error('Seleccione una presentación.');

        setLoading(true);
        try {
            if (activeTab === 1) {
                // --- KARDEX PRESENTACIÓN ---
                const res = await kardexService.getMovimientos(filtros);
                const salRes = await kardexService.getSaldos(filtros);

                if (res.isSuccess && res.data) {
                    setMovimientos(res.data);
                } else {
                    setMovimientos([]);
                }
                
                if (salRes.isSuccess && salRes.data) {
                    setSaldos({
                        real: salRes.data.stockReal || 0,
                        disponible: salRes.data.stockDisponible || 0,
                        futuro: salRes.data.stockFuturo || 0
                    });
                }
            } else {
                // --- KARDEX GENERAL (EMPRESA) ---
                const filtrosEmpresa = { ...filtros, almacenId: '' };
                const res = await kardexService.getKardexEmpresa(filtrosEmpresa);
                const salRes = await kardexService.getSaldosEmpresa(filtrosEmpresa);

                if (res.isSuccess && res.data) {
                    // Aplanamos el diccionario a una lista
                    const dataAplanada = Object.entries(res.data as Record<string, MovimientoEmpresaDto[]>).flatMap(([llave, lista]) => {
                        const anio = llave.slice(-4);
                        const periodo = llave.slice(0, -4).toUpperCase();
                        const nombrePeriodo = `${periodo} ${anio}`; 
                        
                        return lista.map(item => ({
                            ...item,
                            periodoAgrupado: nombrePeriodo 
                        }));
                    });
                    setMovimientos(dataAplanada);
                } else {
                    setMovimientos([]);
                }
                
                if (salRes.isSuccess && salRes.data) {
                    setSaldos({
                        real: salRes.data.saldoReal || 0,
                        disponible: salRes.data.saldoDisponible || 0,
                        futuro: salRes.data.saldoFuturo || 0
                    });
                }
            }
        } catch {
            toast.error('Error al consultar el servidor.');
        } finally {
            setLoading(false);
        }
    };

    const handleExportar = async () => {
        if (movimientos.length === 0) return toast.warning('No hay datos para exportar.');
        
        try {
            const blob = activeTab === 1 
                ? await kardexService.exportarPresentacion(filtros)
                : await kardexService.exportarEmpresa({ ...filtros, almacenId: '' });

            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Kardex_${activeTab === 1 ? 'Pres' : 'Gral'}_${new Date().getTime()}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch {
            toast.error('Error al descargar el Excel.');
        }
    };

    return (
        <div className="p-4 space-y-4 bg-slate-50 min-h-screen">
            {/* TABS */}
            <div className="flex gap-1">
                <button 
                    onClick={() => { setActiveTab(1); setMovimientos([]); setSaldos({real:0, disponible:0, futuro:0}); }}
                    className={`px-6 py-3 rounded-t-lg font-bold text-xs transition-all flex items-center gap-2 border-b-4 
                    ${activeTab === 1 ? 'bg-[#59696A] text-white border-red-500 shadow-lg' : 'bg-white text-slate-500 border-transparent hover:bg-slate-100'}`}
                >
                    <IconPackage size={16} /> Kardex por Presentación
                </button>
                <button 
                    onClick={() => { setActiveTab(3); setMovimientos([]); setSaldos({real:0, disponible:0, futuro:0}); }}
                    className={`px-6 py-3 rounded-t-lg font-bold text-xs transition-all flex items-center gap-2 border-b-4 
                    ${activeTab === 3 ? 'bg-[#59696A] text-white border-red-500 shadow-lg' : 'bg-white text-slate-500 border-transparent hover:bg-slate-100'}`}
                >
                    <IconDatabase size={16} /> Kardex General
                </button>
            </div>

            {/* PANEL PRINCIPAL */}
            <div className="bg-white p-4 rounded-b-xl rounded-tr-xl shadow-sm border border-slate-200 border-t-2 border-t-[#59696A]">
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(280px,420px)_1fr_auto] gap-4 items-end">
                    <div className="min-w-0">
                        <SearchableSelect
                            label="Bien (Producto)"
                            value={filtros.bienId}
                            fallbackLabel={bienLabel}
                            placeholder="Buscar producto..."
                            fetchCustom={async (term) => {
                                const res = await productoService.getByEmpresa(EMPRESA_ID, 1, 20, term, { condicion_estado: ['STOCK'] }, true);
                                return ((res.data || []) as ProductoApi[]).map((p) => ({
                                    key: String(p.bienId || '').trim(),
                                    value: String(p.bienId || '').trim(),
                                    label: String(p.descripcion || '').trim(),
                                    aux: String(p.codigo_existencia || '').trim()
                                }));
                            }}
                            onChange={handleBienChange}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 items-end">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Fecha Inicial
                            </label>
                            <input 
                                type="date" 
                                className="w-full border border-slate-300 rounded-lg px-3 py-[9px] text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#59696A]/30 focus:border-[#59696A] transition-all shadow-sm" 
                                value={filtros.fechaInicial} 
                                onChange={e => setFiltros({...filtros, fechaInicial: e.target.value})} 
                            />
                        </div>
                        
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Fecha Final
                            </label>
                            <input 
                                type="date" 
                                className="w-full border border-slate-300 rounded-lg px-3 py-[9px] text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#59696A]/30 focus:border-[#59696A] transition-all shadow-sm" 
                                value={filtros.fechaFinal} 
                                onChange={e => setFiltros({...filtros, fechaFinal: e.target.value})} 
                            />
                        </div>
                        
                        {activeTab === 1 ? (
                            <>
                                <SearchableSelect
                                    label="Almacén"
                                    name="almacenId"
                                    options={almacenOptions}
                                    value={filtros.almacenId}
                                    disabled={loadingCatalogs}
                                    placeholder={loadingCatalogs ? 'Cargando almacenes...' : 'Seleccione almacén'}
                                    onChange={handleAlmacenChange}
                                />
                                <SearchableSelect
                                    label="Presentación"
                                    options={presentacionOptions}
                                    value={filtros.presentacionId}
                                    fallbackLabel={presLabel}
                                    disabled={!filtros.bienId}
                                    onChange={handlePresentacionChange}
                                />
                                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 items-end">
                                    <SearchableSelect
                                        label="Lote"
                                        value={filtros.lote}
                                        fallbackLabel={loteLabel}
                                        placeholder="Todos los lotes"
                                        disabled={!filtros.presentacionId}
                                        fetchCustom={fetchLotes}
                                        fetchParams={{ almacenId: filtros.almacenId, presentacionId: filtros.presentacionId }}
                                        onChange={handleLoteChange}
                                    />
                                    <button
                                        type="button"
                                        title="Limpiar lote"
                                        disabled={!filtros.lote}
                                        onClick={() => { setFiltros(prev => ({ ...prev, lote: '' })); setLoteLabel(''); }}
                                        className="mb-0 h-[38px] w-[38px] rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center transition"
                                    >
                                        <IconX size={16} />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Agrupamiento</label>
                                <select
                                    className="w-full border border-slate-300 rounded-lg px-3 py-[9px] text-sm text-slate-700 bg-white outline-none focus:ring-2 focus:ring-[#59696A]/30 focus:border-[#59696A] transition-all shadow-sm"
                                    value={filtros.agrupamiento}
                                    onChange={(e) => setFiltros({ ...filtros, agrupamiento: e.target.value })}
                                >
                                    <option value="MENSUAL">MENSUAL</option>
                                    <option value="TRIMESTRAL">TRIMESTRAL</option>
                                </select>
                            </div>
                        )}

                        {activeTab === 3 && <div className="hidden xl:block" />}
                    </div>

                    <div className="flex gap-2 justify-start xl:justify-end">
                        <button onClick={handleBuscar} disabled={loading} className="flex items-center justify-center gap-2 bg-[#59696A] px-4 py-2.5 rounded-lg text-white hover:bg-slate-700 transition shadow-sm min-w-[112px] disabled:opacity-60">
                            <IconSearch size={18} /> Buscar
                        </button>
                        <button onClick={handleExportar} disabled={movimientos.length === 0} className="flex items-center justify-center gap-2 bg-emerald-600 px-4 py-2.5 rounded-lg text-white hover:bg-emerald-700 transition shadow-sm min-w-[104px] disabled:opacity-50">
                            <IconFileSpreadsheet size={18} /> Excel
                        </button>
                    </div>
                </div>

                {/* INDICADORES DE SALDO CONDICIONALES */}
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                    <div className="min-w-[160px] rounded-lg border border-slate-800 bg-slate-800 px-3 py-2 text-white">
                        <p className="text-[10px] text-slate-300 uppercase font-bold tracking-wider">Saldo Real</p>
                        <p className="font-mono text-lg font-semibold leading-tight">{saldos.real.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
                    </div>

                    {/* Disponible y Futuro SOLO en Kardex General */}
                    {activeTab === 3 && (
                        <>
                            <div className="min-w-[160px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Saldo Disponible</p>
                                <p className="font-mono text-lg font-semibold leading-tight text-slate-700">{saldos.disponible.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div className="min-w-[160px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Saldo Futuro</p>
                                <p className="font-mono text-lg font-semibold leading-tight text-slate-700">{saldos.futuro.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
                            </div>
                        </>
                    )}
                </div>

            </div> {/* Fin Panel Principal */}

            {/* TABLA PRINCIPAL */}
            <KardexDataTable 
                data={movimientos} 
                loading={loading}
                columns={activeTab === 1 ? columnsKardexPres : columnsKardexGral}
                groupByPeriod={activeTab === 3}
            />
        </div>
    );
}
