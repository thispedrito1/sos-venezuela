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
  
  // Estados del Formulario
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

  // 1. CAPTURA MANUAL (Usa el centro de la pantalla por defecto)
  const abrirModalManual = () => {
    if (mapRef.current) {
      const center = mapRef.current.getCenter();
      setNuevaLat(center.lat);
      setNuevaLng(center.lng);
    }
    setMostrarModal(true);
  };

  // 2. CAPTURA POR GPS (Botón opcional dentro del modal)
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
      // Agregada barra diagonal al final de la ruta para compatibilidad estricta con FastAPI
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
      {/* Target visual para guiar el centro de la pantalla */}
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