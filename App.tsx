import React, { useState, useEffect, useMemo } from 'react';
import { db, materialsTable } from './db';
import { Material, MaterialStatus, ViewMode } from './types';
import * as Lucide from 'lucide-react';
import { format } from 'date-fns';
import { toSwissDate, getDaysUntil, isExpired, isExpiringIn, fromSwissDate } from './utils/dateUtils';
import { humanizeLocation } from './utils/locationUtils';

// --- Subcomponents ---

const SidebarButton = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

const StatCard = ({ label, value, icon, colorClass = "", onClick }: any) => (
  <div 
    onClick={onClick}
    className={`bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between cursor-pointer hover:shadow-md transition group ${colorClass}`}
  >
    <div>
      <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
    <div className="p-3 bg-slate-50 rounded-full group-hover:bg-slate-100 transition">
      {icon}
    </div>
  </div>
);

const Dashboard = ({ stats, setView, setFilterStatus }: any) => {
  const navigateTo = (v: any, s: string) => {
    setFilterStatus(s);
    setView(v);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Benvenuto nel Registro RM</h2>
        <p className="text-slate-500">Gestione inventario e scorte materiali di riferimento.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Attivi" 
          value={stats.attivi} 
          icon={<Lucide.CheckCircle2 className="text-green-500" />} 
          onClick={() => navigateTo('LIST', 'ATTIVO')}
        />
        <StatCard 
          label="Scaduti" 
          value={stats.scaduti} 
          icon={<Lucide.AlertTriangle className="text-red-600" />} 
          colorClass="border-l-4 border-red-600 bg-red-50"
          onClick={() => navigateTo('LIST', 'SCADUTI')}
        />
        <StatCard 
          label="In Esaurimento" 
          value={stats.sottoSoglia} 
          icon={<Lucide.Box className="text-orange-500" />} 
          colorClass="border-l-4 border-orange-500"
          onClick={() => navigateTo('LIST', 'SOTTO_SOGLIA')}
        />
        <StatCard 
          label="Scade < 30gg" 
          value={stats.scadenza30} 
          icon={<Lucide.CalendarClock className="text-yellow-500" />} 
          onClick={() => navigateTo('LIST', 'SCADENZA_30')}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Lucide.AlertTriangle className="w-5 h-5 mr-2 text-red-500" /> Azioni Rapide Necessarie
          </h3>
          <div className="space-y-3">
            {stats.scaduti > 0 && (
              <p className="text-red-600 font-medium underline cursor-pointer flex items-center" onClick={() => navigateTo('LIST', 'SCADUTI')}>
                <Lucide.ChevronRight className="w-4 h-4 mr-1" /> Ritirare {stats.scaduti} materiali scaduti!
              </p>
            )}
            {stats.sottoSoglia > 0 && (
              <p className="text-orange-600 font-medium underline cursor-pointer flex items-center" onClick={() => navigateTo('LIST', 'SOTTO_SOGLIA')}>
                <Lucide.ChevronRight className="w-4 h-4 mr-1" /> Riordinare {stats.sottoSoglia} materiali in esaurimento!
              </p>
            )}
            {stats.scaduti === 0 && stats.sottoSoglia === 0 && (
              <p className="text-green-600 font-medium">Inventario in ottimo stato. Nessun riordino urgente.</p>
            )}
          </div>
        </div>

        <div className="bg-blue-600 rounded-xl shadow-lg p-6 text-white flex flex-col justify-center">
          <h3 className="text-xl font-bold mb-2">Nuovo Arrivo?</h3>
          <p className="text-blue-100 mb-4 text-sm">Registra velocemente un nuovo lotto o aggiungi scorte a un RM esistente.</p>
          <button 
            onClick={() => setView('FORM')}
            className="bg-white text-blue-600 font-bold py-2 px-4 rounded-lg hover:bg-blue-50 transition self-start flex items-center"
          >
            <Lucide.Plus className="w-4 h-4 mr-2" /> Aggiungi Record
          </button>
        </div>
      </div>
    </div>
  );
};

const StockBadge = ({ current, min }: { current: number, min: number }) => {
  let color = "bg-green-100 text-green-700";
  if (current === 0) color = "bg-red-100 text-red-700 animate-pulse";
  else if (current <= min) color = "bg-orange-100 text-orange-700";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${color}`}>
      {current} pz
    </span>
  );
};

const MaterialList = ({ 
  materials, 
  searchTerm, 
  setSearchTerm, 
  filterStatus, 
  setFilterStatus,
  onEdit,
  onRetire,
  onOpenPackage,
  onDelete
}: any) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Inventario Materiali</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <Lucide.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cerca nome, lotto..." 
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm w-full sm:w-64 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ATTIVO">Solo Attivi</option>
            <option value="SOTTO_SOGLIA">In Esaurimento</option>
            <option value="SCADUTI">Scaduti</option>
            <option value="RITIRATO">Ritirati</option>
            <option value="TUTTI">Tutti</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-xs tracking-wider">
              <tr>
                <th className="px-6 py-4">Standard & Lotto</th>
                <th className="px-6 py-4">Scadenza</th>
                <th className="px-6 py-4">Stock Magazzino</th>
                <th className="px-6 py-4">Ubicazione</th>
                <th className="px-6 py-4 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {materials.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-400">Nessun record trovato.</td>
                </tr>
              ) : (
                materials.map((m: any) => (
                  <tr key={m.id} className={`hover:bg-slate-50 transition ${m.stato === MaterialStatus.RITIRATO ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{m.nome}</div>
                      <div className="text-xs text-slate-500 font-mono">Lot: {m.lotto}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{toSwissDate(m.dataScadenza)}</div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">
                        {isExpired(m.dataScadenza) ? <span className="text-red-600">SCADUTO</span> : `${getDaysUntil(m.dataScadenza)} gg`}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <StockBadge current={m.quantitaStock} min={m.sogliaMinima} />
                        {m.stato === MaterialStatus.ATTIVO && m.quantitaStock > 0 && (
                          <button 
                            onClick={() => onOpenPackage(m)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                            title="Apri una confezione"
                          >
                            <Lucide.PackageOpen className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {m.quantitaStock === 0 && m.stato === MaterialStatus.ATTIVO && (
                        <div className="text-[10px] text-red-600 font-bold mt-1 uppercase">Ultima unità in uso!</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-semibold">{m.ubicazione}</div>
                      <div className="text-[10px] text-slate-400 italic">{humanizeLocation(m.ubicazione)}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button onClick={() => onEdit(m)} className="p-1.5 text-slate-400 hover:text-blue-600 transition"><Lucide.Edit3 className="w-4 h-4" /></button>
                        {m.stato === MaterialStatus.ATTIVO && (
                          <button onClick={() => onRetire(m.id)} className="p-1.5 text-slate-400 hover:text-orange-600 transition"><Lucide.Archive className="w-4 h-4" /></button>
                        )}
                        <button onClick={() => onDelete(m.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition"><Lucide.Trash2 className="w-4 h-4" /></button>
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
  );
};

const MaterialForm = ({ material, onSave, onCancel }: any) => {
  const [formData, setFormData] = useState<Material>(
    material || {
      nome: '',
      lotto: '',
      dataApertura: format(new Date(), 'yyyy-MM-dd'),
      dataScadenza: '',
      ubicazione: '',
      stato: MaterialStatus.ATTIVO,
      quantitaStock: 0,
      sogliaMinima: 1,
      note: ''
    }
  );

  const handleSubmit = (e: any) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">{material ? 'Modifica RM' : 'Nuovo RM'}</h2>
          <p className="text-slate-400 text-xs">Inserisci i dettagli del materiale e le scorte.</p>
        </div>
        <Lucide.Box className="w-8 h-8 text-blue-400" />
      </div>
      
      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Nome Standard *</label>
            <input required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} placeholder="es. UMA-19" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Lotto *</label>
            <input required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono" value={formData.lotto} onChange={e => setFormData({...formData, lotto: e.target.value})} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Ubicazione *</label>
            <input required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg uppercase" value={formData.ubicazione} onChange={e => setFormData({...formData, ubicazione: e.target.value.toUpperCase()})} placeholder="es. FL013" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Data Scadenza *</label>
            <input type="date" required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg" value={formData.dataScadenza} onChange={e => setFormData({...formData, dataScadenza: e.target.value})} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Stato</label>
            <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg" value={formData.stato} onChange={e => setFormData({...formData, stato: e.target.value as MaterialStatus})}>
              <option value={MaterialStatus.ATTIVO}>ATTIVO</option>
              <option value={MaterialStatus.RITIRATO}>RITIRATO</option>
            </select>
          </div>

          <div className="bg-blue-50 p-4 rounded-xl md:col-span-2 grid grid-cols-2 gap-4 border border-blue-100">
             <div className="space-y-1">
                <label className="text-xs font-bold text-blue-700 uppercase">Stock Magazzino</label>
                <input type="number" min="0" className="w-full px-4 py-2 border border-blue-200 rounded-lg" value={formData.quantitaStock} onChange={e => setFormData({...formData, quantitaStock: parseInt(e.target.value) || 0})} />
                <p className="text-[10px] text-blue-500 italic">Confezioni integre disponibili</p>
             </div>
             <div className="space-y-1">
                <label className="text-xs font-bold text-blue-700 uppercase">Soglia Allerta</label>
                <input type="number" min="0" className="w-full px-4 py-2 border border-blue-200 rounded-lg" value={formData.sogliaMinima} onChange={e => setFormData({...formData, sogliaMinima: parseInt(e.target.value) || 0})} />
                <p className="text-[10px] text-blue-500 italic">Avvisa quando lo stock è &le; a questo valore</p>
             </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100">
          <button type="button" onClick={onCancel} className="px-6 py-2 rounded-lg text-slate-600 hover:bg-slate-100 transition">Annulla</button>
          <button type="submit" className="px-8 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-lg hover:bg-blue-700 transition">Salva Record</button>
        </div>
      </form>
    </div>
  );
};

// --- Main App Component ---

const App = () => {
  const [view, setView] = useState('DASHBOARD');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ATTIVO');
  const [isLoading, setIsLoading] = useState(true);

  const loadMaterials = async () => {
    setIsLoading(true);
    try {
      const all = await materialsTable.toArray();
      setMaterials(all);
    } catch (error) {
      console.error("Load failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadMaterials(); }, []);

  const stats = useMemo(() => {
    return {
      totale: materials.length,
      attivi: materials.filter(m => m.stato === MaterialStatus.ATTIVO).length,
      ritirati: materials.filter(m => m.stato === MaterialStatus.RITIRATO).length,
      scaduti: materials.filter(m => isExpired(m.dataScadenza)).length,
      scadenza30: materials.filter(m => isExpiringIn(m.dataScadenza, 30)).length,
      scadenza90: materials.filter(m => isExpiringIn(m.dataScadenza, 90)).length,
      sottoSoglia: materials.filter(m => m.stato === MaterialStatus.ATTIVO && m.quantitaStock <= m.sogliaMinima).length
    };
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const matchesSearch = m.nome.toLowerCase().includes(searchTerm.toLowerCase()) || m.lotto.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'TUTTI' || 
                           (filterStatus === 'SCADUTI' && isExpired(m.dataScadenza)) ||
                           (filterStatus === 'SOTTO_SOGLIA' && m.quantitaStock <= m.sogliaMinima && m.stato === MaterialStatus.ATTIVO) ||
                           (m.stato === filterStatus);
      return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(a.dataScadenza).getTime() - new Date(b.dataScadenza).getTime());
  }, [materials, searchTerm, filterStatus]);

  const handleSave = async (data: Material) => {
    if (data.id) await materialsTable.update(data.id, data);
    else await materialsTable.add(data);
    loadMaterials();
    setView('LIST');
    setEditingMaterial(null);
  };

  const handleOpenPackage = async (m: Material) => {
    if (m.quantitaStock <= 0) return;
    
    const newStock = m.quantitaStock - 1;
    
    // Allerta per l'ultima confezione
    if (newStock === 0) {
      alert(`⚠️ ATTENZIONE: Hai appena aperto l'ultima confezione disponibile di ${m.nome} (Lotto: ${m.lotto}). \n\nÈ necessario procedere al riordino immediato.`);
    }

    await materialsTable.update(m.id!, { quantitaStock: newStock });
    loadMaterials();
  };

  const handleRetire = async (id: number) => {
    await materialsTable.update(id, { stato: MaterialStatus.RITIRATO });
    loadMaterials();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Eliminare definitivamente il record?')) {
      await materialsTable.delete(id);
      loadMaterials();
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <nav className="w-full md:w-64 bg-slate-900 text-white flex flex-col p-4 space-y-2 border-r border-slate-800">
        <div className="flex items-center space-x-2 px-2 py-4 mb-4 border-b border-slate-700">
          <Lucide.FlaskConical className="w-8 h-8 text-blue-400" />
          <h1 className="text-xl font-bold leading-tight">RM <span className="text-blue-400">Registry</span></h1>
        </div>
        
        <SidebarButton active={view === 'DASHBOARD'} onClick={() => setView('DASHBOARD')} icon={<Lucide.LayoutDashboard className="w-5 h-5" />} label="Dashboard" />
        <SidebarButton active={view === 'LIST' && filterStatus === 'ATTIVO'} onClick={() => { setView('LIST'); setFilterStatus('ATTIVO'); }} icon={<Lucide.Database className="w-5 h-5" />} label="Inventario" />
        <SidebarButton active={view === 'LIST' && filterStatus === 'SOTTO_SOGLIA'} onClick={() => { setView('LIST'); setFilterStatus('SOTTO_SOGLIA'); }} icon={<Lucide.Box className="w-5 h-5" />} label="Scorte" />
        <SidebarButton active={view === 'FORM'} onClick={() => { setEditingMaterial(null); setView('FORM'); }} icon={<Lucide.PlusCircle className="w-5 h-5" />} label="Nuovo Record" />

        <div className="mt-auto pt-4 text-[10px] text-slate-500 text-center uppercase tracking-widest">v2.0 Stock Management</div>
      </nav>

      <main className="flex-1 p-6 md:p-10 overflow-auto bg-slate-50">
        {isLoading ? (
          <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
        ) : (
          <>
            {view === 'DASHBOARD' && <Dashboard stats={stats} setView={setView} setFilterStatus={setFilterStatus} />}
            {view === 'LIST' && (
              <MaterialList 
                materials={filteredMaterials} searchTerm={searchTerm} setSearchTerm={setSearchTerm} 
                filterStatus={filterStatus} setFilterStatus={setFilterStatus}
                onEdit={(m: any) => { setEditingMaterial(m); setView('FORM'); }}
                onRetire={handleRetire} onOpenPackage={handleOpenPackage} onDelete={handleDelete}
              />
            )}
            {view === 'FORM' && (
              <MaterialForm material={editingMaterial} onSave={handleSave} onCancel={() => setView('LIST')} />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default App;
