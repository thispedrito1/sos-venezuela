'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, X, Navigation, Edit2 } from 'lucide-react';

const API_URL = 'https://sos-venezuela.onrender.com';

interface Insumo { id: string; nombre: string; estado: string; }
interface PuntoMapa { id: string; nombre: string; tipo: string; latitud: number; longitud: number; direccion?: string; referencias?: string; telefono?: string; verificado_oficial: boolean; insumos: Insumo[]; }

const obtenerIconoPorTipo = (tipo: string) => {
  let colorFondo = tipo === 'hospital' ? 'bg-blue-600' : tipo === 'derrumbe' ? 'bg-red-600' : tipo === 'acopio' ? 'bg-emerald-600' : 'bg-slate-600';
  let iconoEmoji = tipo === 'hospital' ? '🏥' : tipo === 'derrumbe' ? '⚠️' : tipo === 'acopio' ? '📦' : '📍';
  const htmlIcon = `
    <div class="flex items-center justify-center w-8 h-8 rounded-full shadow-lg border-2 border-white ${colorFondo} text-white text-sm">${iconoEmoji}</div>
    <div class="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-slate-800 absolute -bottom-2 left-1/2 -translate-x-1/2 drop-shadow-md"></div>
  `;
  return L.divIcon({ html: htmlIcon, className: 'custom-leaflet-icon', iconSize: [32, 40], iconAnchor: [16, 40], popupAnchor: [0, -40] });
};

const CATEGORIAS_INSUMOS = [
  "Insumos médicos", "Hidratación y Comida", "Herramientas de trabajo", 
  "Mano de obra", "Maquinaria Pesada", "Colchones y sábanas", 
  "Ropa (Adultos/Niños)", "Artículos de Aseo Personal"
];

// --- COMPONENTE PARA EL POPUP DEL MAPA ---
const ContenidoPopup = ({ punto, actualizarEstado, eliminarPunto, agregarInsumoExistente, eliminarInsumoExistente, editarInfoPunto, CATEGORIAS_INSUMOS }: any) => {
  const [catSeleccionada, setCatSeleccionada] = useState(CATEGORIAS_INSUMOS[0]);
  const [insumoEspecifico, setInsumumoEspecifico] = useState('');
  
  // Estados para el modo edición
  const [modoEdicion, setModoEdicion] = useState(false);
  const [editNombre, setEditNombre] = useState(punto.nombre);
  const [editDireccion, setEditDireccion] = useState(punto.direccion || '');
  const [editInfo, setEditInfo] = useState(punto.referencias || '');
  const [editTelefono, setEditTelefono] = useState(punto.telefono || '');

  const handleAgregar = () => {
    if (!insumoEspecifico.trim()) return;
    agregarInsumoExistente(punto.id, `${catSeleccionada}: ${insumoEspecifico}`);
    setInsumumoEspecifico(''); 
  };

  const handleGuardarEdicion = async () => {
    await editarInfoPunto(punto.id, {
      nombre: editNombre,
      direccion: editDireccion,
      referencias: editInfo,
      telefono: editTelefono
    });
    setModoEdicion(false);
  };

  return (
    <div className="font-sans min-w-[240px]">
      
      {/* VISTA MODO EDICIÓN */}
      {modoEdicion ? (
        <div className="bg-blue-50 p-2 rounded border border-blue-200 mb-3 space-y-2">
          <input type="text" value={editNombre} onChange={(e) => setEditNombre(e.target.value)} className="w-full border border-slate-300 rounded p-1 text-xs font-bold text-slate-800" placeholder="Nombre del lugar" />
          <input type="text" value={editDireccion} onChange={(e) => setEditDireccion(e.target.value)} className="w-full border border-slate-300 rounded p-1 text-[11px] text-slate-800" placeholder="Dirección" />
          <textarea value={editInfo} onChange={(e) => setEditInfo(e.target.value)} className="w-full border border-slate-300 rounded p-1 text-[11px] text-slate-800 resize-none" placeholder="Referencias extra" rows={2} />
          <input type="text" value={editTelefono} onChange={(e) => setEditTelefono(e.target.value)} className="w-full border border-slate-300 rounded p-1 text-[11px] text-slate-800" placeholder="Teléfono de contacto" />
          <div className="flex gap-2 mt-2">
            <button onClick={handleGuardarEdicion} className="flex-1 bg-blue-600 text-white text-[10px] font-bold py-1.5 rounded">Guardar</button>
            <button onClick={() => setModoEdicion(false)} className="flex-1 bg-slate-300 text-slate-800 text-[10px] font-bold py-1.5 rounded">Cancelar</button>
          </div>
        </div>
      ) : (
      /* VISTA NORMAL */
        <>
          <div className="flex justify-between items-start mb-1">
            <div>
              <h3 className="font-bold text-sm text-slate-800 leading-tight">{punto.nombre}</h3>
              <p className="text-[10px] text-slate-500 capitalize font-medium">Tipo: {punto.tipo}</p>
            </div>
            <button onClick={() => setModoEdicion(true)} className="text-slate-400 hover:text-blue-600 p-1 bg-slate-100 rounded-full" title="Editar Información">
              <Edit2 className="h-3 w-3" />
            </button>
          </div>
          
          {(punto.direccion || punto.referencias || punto.telefono) && (
            <div className="bg-slate-100 p-2 rounded text-[11px] text-slate-600 mb-2 border border-slate-200">
              {punto.direccion && <p><span className="font-bold">📍 Dir:</span> {punto.direccion}</p>}
              {punto.referencias && <p className="mt-1"><span className="font-bold">ℹ️ Info:</span> {punto.referencias}</p>}
              {punto.telefono && <p className="mt-1"><span className="font-bold">📞 Tlf:</span> {punto.telefono}</p>}
            </div>
          )}
        </>
      )}

      {/* Lista de insumos actuales */}
      <div className="space-y-2 mt-2 border-t pt-2 border-slate-200">
        {punto.insumos.map((insumo: any) => (
          <div key={insumo.id} className="flex flex-col gap-1 bg-slate-50 p-1.5 rounded border border-slate-200">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold text-slate-700">{insumo.nombre}</span>
              <button onClick={() => eliminarInsumoExistente(punto.id, insumo.id)} className="text-slate-400 hover:text-red-500 p-0.5"><X className="h-3 w-3" /></button>
            </div>
            <div className="flex w-full gap-1">
              <button onClick={() => actualizarEstado(punto.id, insumo.id, 'ROJO')} className={`flex-1 text-[9px] font-bold py-1 rounded ${insumo.estado === 'ROJO' ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-500'}`}>FALTA</button>
              <button onClick={() => actualizarEstado(punto.id, insumo.id, 'AMARILLO')} className={`flex-1 text-[9px] font-bold py-1 rounded ${insumo.estado === 'AMARILLO' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'}`}>POCO</button>
              <button onClick={() => actualizarEstado(punto.id, insumo.id, 'VERDE')} className={`flex-1 text-[9px] font-bold py-1 rounded ${insumo.estado === 'VERDE' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>HAY</button>
            </div>
          </div>
        ))}
      </div>

      {/* Añadir nueva necesidad */}
      <div className="mt-3 bg-white p-2 rounded border border-slate-200 shadow-sm">
        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Añadir nueva necesidad:</label>
        <select value={catSeleccionada} onChange={(e) => setCatSeleccionada(e.target.value)} className="w-full border border-slate-300 rounded p-1 mb-1 text-[10px] outline-none">
          {CATEGORIAS_INSUMOS.map((cat: string) => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <div className="flex gap-1">
          <input type="text" placeholder="Especificar necesidad" value={insumoEspecifico} onChange={(e) => setInsumumoEspecifico(e.target.value)} className="flex-1 border border-slate-300 rounded p-1 text-[10px] outline-none text-slate-800" />
          <button onClick={handleAgregar} className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-[10px] font-bold transition-colors">Añadir</button>
        </div>
      </div>
      
      <button onClick={() => eliminarPunto(punto.id)} className="w-full mt-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-1.5 rounded text-xs border border-red-200 transition-colors">
        🗑️ Eliminar este reporte
      </button>
    </div>
  );
};


// --- COMPONENTE PRINCIPAL DEL MAPA ---
export default function Mapa() {
  const mapRef = useRef<L.Map | null>(null);
  const [puntos, setPuntos] = useState<PuntoMapa[]>([]);
  
  const [mostrarModal, setMostrarModal] = useState(false);
  const [nuevaLat, setNuevaLat] = useState<number | null>(null);
  const [nuevaLng, setNuevaLng] = useState<number | null>(null);
  
  // Campos del formulario
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoTipo, setNuevoTipo] = useState('derrumbe');
  const [nuevaDireccion, setNuevaDireccion] = useState('');
  const [nuevasReferencias, setNuevasReferencias] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState(''); // <--- NUEVO ESTADO
  
  const [cargandoGPS, setCargandoGPS] = useState(false);

  const [catSeleccionada, setCatSeleccionada] = useState(CATEGORIAS_INSUMOS[0]);
  const [insumoEspecifico, setInsumumoEspecifico] = useState('');
  const [insumosAgregados, setInsumosAgregados] = useState<string[]>([]);

  const cargarPuntos = async () => {
    try {
      const respuesta = await fetch(`${API_URL}/api/puntos`);
      setPuntos(await respuesta.json());
    } catch (error) { console.error('Error al cargar puntos:', error); }
  };

  useEffect(() => { cargarPuntos(); }, []);

  const actualizarEstado = async (puntoId: string, insumoId: string, nuevoEstado: string) => {
    try {
      await fetch(`${API_URL}/api/puntos/${puntoId}/insumos/${insumoId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nuevo_estado: nuevoEstado }) });
      cargarPuntos();
    } catch (error) { console.error('Error al actualizar estado:', error); }
  };

  const agregarInsumoExistente = async (puntoId: string, nombreInsumo: string) => {
    try {
      await fetch(`${API_URL}/api/puntos/${puntoId}/insumos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: nombreInsumo }) });
      cargarPuntos(); 
    } catch (error) { console.error('Error al agregar insumo:', error); }
  };

  const eliminarInsumoExistente = async (puntoId: string, insumoId: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta necesidad de la lista?")) return;
    try {
      await fetch(`${API_URL}/api/puntos/${puntoId}/insumos/${insumoId}`, { method: 'DELETE' });
      cargarPuntos(); 
    } catch (error) { console.error('Error al eliminar insumo:', error); }
  };

  // NUEVA FUNCIÓN PARA EDITAR INFO PRINCIPAL
  const editarInfoPunto = async (puntoId: string, datosEditados: any) => {
    try {
      await fetch(`${API_URL}/api/puntos/${puntoId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datosEditados) });
      cargarPuntos(); 
    } catch (error) { console.error('Error al editar punto:', error); }
  };

  const eliminarPunto = async (id: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este punto del mapa?")) return;
    try {
      await fetch(`${API_URL}/api/puntos/${id}`, { method: 'DELETE' });
      cargarPuntos();
    } catch (error) { console.error('Error al eliminar punto:', error); }
  };

  const abrirModalManual = () => {
    if (mapRef.current) {
      const center = mapRef.current.getCenter();
      setNuevaLat(center.lat);
      setNuevaLng(center.lng);
    }
    setMostrarModal(true);
  };

  const intentarGPS = () => {
    setCargandoGPS(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => { setNuevaLat(position.coords.latitude); setNuevaLng(position.coords.longitude); setCargandoGPS(false); },
        () => { alert("No se pudo obtener el GPS. Puedes continuar con la ubicación manual."); setCargandoGPS(false); },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  const agregarInsumoALaLista = () => {
    if (!insumoEspecifico.trim()) return;
    setInsumosAgregados([...insumosAgregados, `${catSeleccionada}: ${insumoEspecifico}`]);
    setInsumumoEspecifico('');
  };

  const eliminarInsumoDeLaLista = (index: number) => {
    setInsumosAgregados(insumosAgregados.filter((_, i) => i !== index));
  };

  const guardarNuevoPunto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaLat || !nuevaLng) return;

    try {
      await fetch(`${API_URL}/api/puntos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nombre: nuevoNombre, 
          tipo: nuevoTipo, 
          latitud: nuevaLat, 
          longitud: nuevaLng,
          direccion: nuevaDireccion, 
          referencias: nuevasReferencias,
          telefono: nuevoTelefono, // <--- ENVIAMOS EL TELÉFONO
          insumos_lista: insumosAgregados 
        }),
      });
      setMostrarModal(false);
      setNuevoNombre(''); setNuevaDireccion(''); setNuevasReferencias(''); setNuevoTelefono('');
      setInsumosAgregados([]); setInsumumoEspecifico(''); setCatSeleccionada(CATEGORIAS_INSUMOS[0]);
      cargarPuntos(); 
    } catch (error) { console.error('Error al guardar nuevo punto:', error); }
  };

  return (
    <div className="w-full h-full relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[500] pointer-events-none opacity-50">
        <div className="w-4 h-4 rounded-full border-2 border-slate-900 bg-white/50 shadow"></div>
      </div>

      <MapContainer center={[10.4900, -67.6000]} zoom={9} scrollWheelZoom={true} className="w-full h-full z-0" ref={mapRef}>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        {puntos.map((punto) => (
          <Marker key={punto.id} position={[punto.latitud, punto.longitud]} icon={obtenerIconoPorTipo(punto.tipo)}>
            <Popup>
              <ContenidoPopup 
                punto={punto} 
                actualizarEstado={actualizarEstado} 
                eliminarPunto={eliminarPunto} 
                agregarInsumoExistente={agregarInsumoExistente}
                eliminarInsumoExistente={eliminarInsumoExistente}
                editarInfoPunto={editarInfoPunto} // <--- PASAMOS LA FUNCIÓN
                CATEGORIAS_INSUMOS={CATEGORIAS_INSUMOS}
              />
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="absolute bottom-28 sm:bottom-8 right-0 left-0 flex justify-center z-[1000] pointer-events-none pb-[env(safe-area-inset-bottom)]">
        <button onClick={abrirModalManual} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-2 transition-transform active:scale-95 pointer-events-auto">
          <MapPin className="h-5 w-5" />
          <span className="font-bold text-sm">Reportar aquí</span>
        </button>
      </div>

      {mostrarModal && (
        <div className="absolute inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white p-3 flex justify-between items-center shrink-0">
              <h2 className="font-bold text-sm">Añadir Punto al Mapa</h2>
              <button onClick={() => setMostrarModal(false)}><X className="h-5 w-5 text-slate-400 hover:text-white" /></button>
            </div>
            
            <form onSubmit={guardarNuevoPunto} className="p-4 space-y-4 overflow-y-auto">
              <button type="button" onClick={intentarGPS} disabled={cargandoGPS} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-xs transition-colors">
                <Navigation className={`h-4 w-4 ${cargandoGPS ? 'animate-spin text-blue-500' : ''}`} />
                {cargandoGPS ? 'Buscando satélites...' : 'Usar sensor GPS del teléfono (Opcional)'}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Tipo</label>
                  <select value={nuevoTipo} onChange={(e) => setNuevoTipo(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm text-slate-900 bg-white focus:ring-2 outline-none">
                    <option value="derrumbe">⚠️ Derrumbe</option>
                    <option value="acopio">📦 Centro de Acopio</option>
                    <option value="hospital">🏥 Atención Médica</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Título / Nombre</label>
                  <input type="text" required value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Dirección</label>
                  <input type="text" required value={nuevaDireccion} onChange={(e) => setNuevaDireccion(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm outline-none" />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Teléfono (Opcional)</label>
                  <input type="text" placeholder="Ej. 0414..." value={nuevoTelefono} onChange={(e) => setNuevoTelefono(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm outline-none" />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Referencias extra</label>
                  <input type="text" placeholder="Cerca de..." value={nuevasReferencias} onChange={(e) => setNuevasReferencias(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm outline-none" />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase">¿Qué hace falta? (Añade a la lista)</label>
                <div className="space-y-2 mb-3">
                  <select value={catSeleccionada} onChange={(e) => setCatSeleccionada(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white outline-none">
                    {CATEGORIAS_INSUMOS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Ej. Picos y palas..." value={insumoEspecifico} onChange={(e) => setInsumumoEspecifico(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregarInsumoALaLista(); } }} className="flex-1 border border-slate-300 rounded-lg p-2 text-xs outline-none" />
                    <button type="button" onClick={agregarInsumoALaLista} className="bg-slate-800 text-white font-bold px-3 py-2 rounded-lg text-xs">Añadir</button>
                  </div>
                </div>

                {insumosAgregados.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-2 border-t border-slate-200 pt-2">
                    {insumosAgregados.map((insumo, index) => (
                      <div key={index} className="flex justify-between items-center bg-white border border-slate-200 p-1.5 rounded text-[11px] text-slate-700">
                        <span className="font-medium truncate pr-2">{insumo}</span>
                        <button type="button" onClick={() => eliminarInsumoDeLaLista(index)} className="text-red-500 hover:text-red-700 px-1"><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 shadow-md text-sm mt-2">
                Publicar Emergencia
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}