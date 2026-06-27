'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, X, Navigation } from 'lucide-react';

// URL fija hacia Render para asegurar la conexión directa desde producción
const API_URL = 'https://sos-venezuela-api.onrender.com';

interface Insumo { id: string; nombre: string; estado: string; }
interface PuntoMapa { id: string; nombre: string; tipo: string; latitud: number; longitud: number; direccion?: string; referencias?: string; verificado_oficial: boolean; insumos: Insumo[]; }

const obtenerIconoPorTipo = (tipo: string) => {
  let colorFondo = tipo === 'hospital' ? 'bg-blue-600' : tipo === 'derrumbe' ? 'bg-red-600' : tipo === 'acopio' ? 'bg-emerald-600' : 'bg-slate-600';
  let iconoEmoji = tipo === 'hospital' ? '🏥' : tipo === 'derrumbe' ? '⚠️' : tipo === 'acopio' ? '📦' : '📍';
  const htmlIcon = `
    <div class="flex items-center justify-center w-8 h-8 rounded-full shadow-lg border-2 border-white ${colorFondo} text-white text-sm">${iconoEmoji}</div>
    <div class="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-slate-800 absolute -bottom-2 left-1/2 -translate-x-1/2 drop-shadow-md"></div>
  `;
  return L.divIcon({ html: htmlIcon, className: 'custom-leaflet-icon', iconSize: [32, 40], iconAnchor: [16, 40], popupAnchor: [0, -40] });
};

export default function Mapa() {
  const mapRef = useRef<L.Map | null>(null);
  const [puntos, setPuntos] = useState<PuntoMapa[]>([]);
  
  const [mostrarModal, setMostrarModal] = useState(false);
  const [nuevaLat, setNuevaLat] = useState<number | null>(null);
  const [nuevaLng, setNuevaLng] = useState<number | null>(null);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoTipo, setNuevoTipo] = useState('derrumbe');
  const [nuevaDireccion, setNuevaDireccion] = useState('');
  const [nuevasReferencias, setNuevasReferencias] = useState('');
  const [cargandoGPS, setCargandoGPS] = useState(false);

  const cargarPuntos = async () => {
    try {
      const respuesta = await fetch(`${API_URL}/api/puntos`);
      setPuntos(await respuesta.json());
    } catch (error) { console.error('Error al cargar puntos:', error); }
  };

  useEffect(() => { cargarPuntos(); }, []);

  const actualizarEstado = async (puntoId: string, insumoId: string, nuevoEstado: string) => {
    try {
      await fetch(`${API_URL}/api/puntos/${puntoId}/insumos/${insumoId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nuevo_estado: nuevoEstado }),
      });
      cargarPuntos();
    } catch (error) { console.error('Error al actualizar estado:', error); }
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
        (position) => {
          setNuevaLat(position.coords.latitude);
          setNuevaLng(position.coords.longitude);
          setCargandoGPS(false);
        },
        () => { alert("No se pudo obtener el GPS. Puedes continuar con la ubicación manual del mapa."); setCargandoGPS(false); },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  const guardarNuevoPunto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaLat || !nuevaLng) return;

    try {
      await fetch(`${API_URL}/api/puntos/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nombre: nuevoNombre, tipo: nuevoTipo, latitud: nuevaLat, longitud: nuevaLng,
          direccion: nuevaDireccion, referencias: nuevasReferencias 
        }),
      });
      setMostrarModal(false);
      setNuevoNombre(''); setNuevaDireccion(''); setNuevasReferencias('');
      cargarPuntos(); 
    } catch (error) { console.error('Error al guardar nuevo punto:', error); }
  };

  return (
    <div className="w-full h-full relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[500] pointer-events-none opacity-50">
        <div className="w-4 h-4 rounded-full border-2 border-slate-900 bg-white/50 shadow"></div>
      </div>

      <MapContainer 
        center={[10.4900, -67.6000]} zoom={9} scrollWheelZoom={true} className="w-full h-full z-0"
        ref={mapRef}
      >
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        {puntos.map((punto) => (
          <Marker key={punto.id} position={[punto.latitud, punto.longitud]} icon={obtenerIconoPorTipo(punto.tipo)}>
            <Popup>
              <div className="font-sans min-w-[240px]">
                <h3 className="font-bold text-sm text-slate-800 leading-tight mb-1">{punto.nombre}</h3>
                <p className="text-xs text-slate-500 capitalize mb-1 font-medium">Tipo: {punto.tipo}</p>
                
                {(punto.direccion || punto.referencias) && (
                  <div className="bg-slate-100 p-2 rounded text-[11px] text-slate-600 mb-2 border border-slate-200">
                    {punto.direccion && <p><span className="font-bold">📍 Dirección:</span> {punto.direccion}</p>}
                    {punto.referencias && <p className="mt-1"><span className="font-bold">ℹ️ Info:</span> {punto.referencias}</p>}
                  </div>
                )}

                <div className="space-y-2 mt-2 border-t pt-2 border-slate-200">
                  {punto.insumos.map((insumo) => (
                    <div key={insumo.id} className="flex flex-col gap-1 bg-slate-50 p-1.5 rounded border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-700">{insumo.nombre}</span>
                      <div className="flex w-full gap-1">
                        <button onClick={() => actualizarEstado(punto.id, insumo.id, 'ROJO')} className={`flex-1 text-[9px] font-bold py-1 rounded ${insumo.estado === 'ROJO' ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-500'}`}>FALTA</button>
                        <button onClick={() => actualizarEstado(punto.id, insumo.id, 'AMARILLO')} className={`flex-1 text-[9px] font-bold py-1 rounded ${insumo.estado === 'AMARILLO' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'}`}>POCO</button>
                        <button onClick={() => actualizarEstado(punto.id, insumo.id, 'VERDE')} className={`flex-1 text-[9px] font-bold py-1 rounded ${insumo.estado === 'VERDE' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>HAY</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="absolute bottom-6 right-0 left-0 flex justify-center z-[1000] pointer-events-none">
        <button 
          onClick={abrirModalManual}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-2 transition-transform active:scale-95 pointer-events-auto"
        >
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

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Tipo de Emergencia</label>
                <select value={nuevoTipo} onChange={(e) => setNuevoTipo(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  <option value="derrumbe">⚠️ Derrumbe / Estructura Dañada</option>
                  <option value="acopio">📦 Centro de Acopio</option>
                  <option value="hospital">🏥 Atención Médica</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Título (Ej. Edificio Las Palmas)</label>
                <input type="text" required value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Dirección (Calle, Av, Sector)</label>
                <input type="text" required placeholder="Ej. Av. Principal, Urb. La Carlota" value={nuevaDireccion} onChange={(e) => setNuevaDireccion(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Referencias Adicionales para llegar</label>
                <textarea rows={2} placeholder="Ej. Entrar por el callejón detrás de la panadería, calle bloqueada por escombros." value={nuevasReferencias} onChange={(e) => setNuevasReferencias(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"></textarea>
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