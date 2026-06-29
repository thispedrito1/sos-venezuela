# SOS-Venezuela 🇻🇪 — Mapa de Ayuda e Insumos en Tiempo Real

¡Hola, hermanos! A pesar de estar lejos, mi corazón sigue en Venezuela. He desarrollado **SOS-Venezuela**, una plataforma web e interactiva diseñada para centralizar, organizar y optimizar la distribución de ayuda humanitaria e insumos ante la situación de emergencia actual. 

La premisa es simple: evitar el caos de las cadenas desactualizadas de WhatsApp y permitir que la comunidad en el terreno, voluntarios y rescatistas sepan **qué hace falta, dónde hace falta y qué necesidades ya han sido cubiertas**.

📍 **Despliegue de producción:** [https://mapa-suministros-vzla.vercel.app/](https://mapa-suministros-vzla.vercel.app/)  
Desarrollado y mantenido por: [@thispedrito1](https://github.com/thispedrito1)

---

## 🚀 Características Clave

*   **📍 Reportes Georreferenciados:** Creación instantánea de tres tipos de puntos críticos: `⚠️ Derrumbes`, `📦 Centros de Acopio` y `🏥 Atención Médica`.
*   **📊 Semáforo de Necesidades Dinámico:** Cada punto contiene una lista de necesidades organizadas por categorías cerradas (Insumos médicos, Alimentos/Hidratación, Herramientas, etc.). Cualquier usuario puede actualizar el estado en tiempo real:
    *   🔴 **FALTA:** Urgencia máxima.
    *   🟡 **POCO:** Suministro crítico o por agotarse.
    *   🟢 **HAY:** Necesidad cubierta (evita el desvío innecesario de recursos).
*   **🔍 Buscador de Direcciones Inteligente:** Integración nativa con la API de OpenStreetMap (Nominatim). El usuario puede escribir referencias locales cortas (ej: *Avenida Bolívar, Chacao*) y el mapa reubica el marcador automáticamente, eliminando la dependencia estricta del sensor GPS del dispositivo.
*   **📱 Diseño Ultra-Ligero (Mobile First):** Interfaz optimizada para su uso en navegadores móviles (incluyendo soluciones flotantes responsivas para iOS/Safari) y bajo consumo de datos.

---

## 🛠️ Stack Tecnológico

La arquitectura está completamente desacoplada para garantizar velocidad y escalabilidad:

*   **Frontend:** `Next.js` + `React` + `Tailwind CSS` + `Lucide React` (Iconos).
*   **Mapas interactivos:** `Leaflet` + `React-Leaflet` (Mapeo open-source libre de tokens de pago).
*   **Backend:** `FastAPI` (Python) + `SQLAlchemy` (ORM).
*   **Base de Datos:** `PostgreSQL` (Render).
*   **Hosting:** `Vercel` (Frontend) y `Render` (Backend y Base de Datos).

---

## 📊 Análisis Técnico: Pros y Contras

Evaluación objetiva del comportamiento de la plataforma en escenarios reales de crisis y zonas de desastre[cite: 1]:

### 🟩 Ventajas Significativas (Pros)
*   **Optimización para Baja Conectividad:** El backend en FastAPI transfiere payloads JSON de texto plano sumamente pequeños (escasos Kilobytes)[cite: 1]. La implementación de **actualizaciones optimistas** en el frontend cambia el estado visual de los botones de forma instantánea en la pantalla, enviando la petición de red en segundo plano para evitar congelamientos en conexiones inestables (2G/3G/EDGE)[cite: 1].
*   **Fácil Alimentación de Datos:** Los emojis integrados (`🏥`, `⚠️`, `📦`) actúan como marcadores visuales rápidos[cite: 1]. Al no descargar archivos de imágenes pesados para los iconos, se ahorran decenas de peticiones HTTP en el dispositivo del usuario[cite: 1].
*   **Entrada de Datos Desacoplada:** Gracias al autocompletado inteligente de direcciones, el usuario no necesita pelearse con el mapa interactivo ni conocer coordenadas decimales bajo situaciones de estrés elevado[cite: 1].
*   **Infraestructura de Costo Cero:** Sostenido al 100% sobre capas gratuitas escalables, eliminando barreras financieras para el despliegue del proyecto social[cite: 1].

### 🟥 Limitaciones y Desafíos (Contras)
*   **Vulnerabilidad a Reportes Falsos (Spam/Vandalismo):** Al priorizar el acceso rápido y sin fricciones en emergencias, la plataforma no requiere autenticación obligatoria (OAuth o SMS)[cite: 1]. Esto expone al sistema a reportes erróneos o eliminaciones accidentales de puntos legítimos[cite: 1].
*   **Carga de Capas de Mapas (Tiles):** Leaflet requiere conexión para descargar las imágenes de mapa de bits de OpenStreetMap[cite: 1]. En un escenario de apagón total o nula cobertura de datos, el mapa de fondo fallará (mostrando una cuadrícula gris), aunque la información y las referencias de texto seguirán siendo legibles[cite: 1].
*   **Restricciones de Conexiones Simultáneas (Render Free):** Las bases de datos de la capa gratuita de Render limitan el pool de conexiones concurrentes[cite: 1]. Un pico de tráfico viral masivo podría colapsar temporalmente el acceso al servidor de datos[cite: 1].

---

## 🔮 Próximos Pasos & Mitigaciones (Roadmap Corto)

Para blindar la plataforma durante el escalamiento masivo, se tienen previstas las siguientes implementaciones[cite: 1]:
1.  **Validación Democrática (Sistema de Votos):** Sustituir el borrado directo de puntos por un sistema de votación ciudadana (*"Confirmar Alerta"* / *"Reportar como Resuelto"*). El punto se ocultará automáticamente solo tras acumular un número determinado de reportes repetidos[cite: 1].
2.  **Soporte Offline (Caché PWA):** Configurar Service Workers para almacenar en caché del navegador los *tiles* del mapa de la zona de desastre, permitiendo que la app cargue de forma desconectada si el usuario ya la abrió previamente con señal[cite: 1].
3.  **Migración de Infraestructura:** Transicionar el almacenamiento hacia plataformas con mayor tolerancia a conexiones concurrentes en sus niveles libres, tales como **Supabase** o **Neon**[cite: 1].

---

## 💻 Instalación y Desarrollo Local

### Requisitos previos
*   Node.js (v18 o superior)
*   Python (v3.10 o superior)

### 1. Clonar el repositorio
```bash
git clone https://github.com/thispedrito1/venezuela-ayuda-mapa.git
cd venezuela-ayuda-mapa
2. Configurar el Backend (FastAPI)
Entrar a la carpeta raíz del backend o configurar el entorno virtual de Python:

Bash
python3 -m venv .venv
source .venv/bin/activate
Instalar dependencias de Python:

Bash
pip install -r requirements.txt
Ejecutar el servidor de desarrollo del backend:

Bash
uvicorn main:app --reload
3. Configurar el Frontend (Next.js)
Abre otra ventana de la terminal y ejecuta los siguientes comandos para instalar y correr el cliente web:

Bash
cd frontend
npm install
npm run dev
Una vez iniciado, accede a http://localhost:3000 en tu navegador.

🤝 Contribuciones y Soporte
Si eres desarrollador, diseñador o estás recolectando datos valiosos en el terreno (ONGs, grupos vecinales, Protección Civil), ¡tu ayuda es crucial!

Si tienes bases de datos extensas en formatos Excel/CSV o minería de datos de cadenas de WhatsApp, puedes ponerte en contacto conmigo a través de mi perfil de GitHub o abrir un Issue directamente para inyectar la información de forma masiva a través de scripts automatizados.

Para mejoras de código, abre un Pull Request hacia la rama main.

¡Cada granito de arena cuenta para nuestro país! La organización salva vidas. 🇻🇪🙏