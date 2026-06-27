// src/app/page.tsx
'use client';

import dynamic from 'next/dynamic';
import { ShieldAlert, MapPin, RefreshCw } from 'lucide-react';

// Cargamos el mapa dinámicamente deshabilitando SSR para evitar errores de Leaflet
const MapaFrentero = dynamic(() => import('@/components/mapa'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full bg-slate-100 text-slate-600">
      <div className="text-center">
        <RefreshCw className="animate-spin h-8 w-8 mx-auto mb-2 text-blue-600" />
        <p className="text-sm font-medium">Cargando mapa de emergencia...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-50 flex flex-col antialiased selection:bg-blue-500 selection:text-white">
      {/* Navbar móvil superior */}
      <header className="w-full bg-slate-900 text-white px-4 py-3 flex items-center justify-between shadow-md z-10">
        <div className="flex items-center gap-2">
          <ShieldAlert className="text-amber-500 h-5 w-5" />
          <h1 className="font-bold text-base tracking-tight">SOS Venezuela</h1>
        </div>
        <div className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 border border-emerald-500/30">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Tiempo Real
        </div>
      </header>

      {/* Contenedor del mapa (Ocupa todo el espacio restante) */}
      <div className="flex-1 w-full h-full relative">
        <MapaFrentero />
      </div>

      {/* Botón Flotante rápido (FAB) para reportar (Mobile First) */}
      <button 
        className="absolute bottom-6 right-4 bg-blue-600 active:bg-blue-700 text-white p-4 rounded-full shadow-xl z-10 flex items-center justify-center transition-transform active:scale-95"
        onClick={() => alert('Pronto: Abrir modal para añadir punto con tu ubicación GPS')}
      >
        <MapPin className="h-6 w-6" />
      </button>
    </main>
  );
}