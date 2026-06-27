from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy import create_engine, Column, String, Float, Boolean, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship
import uuid
import os

# --- NUEVA CONFIGURACIÓN DE BASE DE DATOS (POSTGRESQL / SQLITE) ---
# Obtenemos la URL de Render. Si no existe, usamos SQLite local.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ayuda_venezuela.db")

# SQLAlchemy requiere que la URL empiece con postgresql:// en lugar de postgres://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# connect_args={"check_same_thread": False} solo se necesita para SQLite
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
# -------------------------------------------------------------------

# Modelos ORM
class DBPuntoMapa(Base):
    __tablename__ = "puntos"
    id = Column(String, primary_key=True, index=True)
    nombre = Column(String)
    tipo = Column(String)
    latitud = Column(Float)
    longitud = Column(Float)
    direccion = Column(String, nullable=True)
    referencias = Column(String, nullable=True)
    verificado_oficial = Column(Boolean, default=False)
    insumos = relationship("DBInsumo", back_populates="punto", cascade="all, delete-orphan")

class DBInsumo(Base):
    __tablename__ = "insumos"
    id = Column(String, primary_key=True, index=True)
    punto_id = Column(String, ForeignKey("puntos.id"))
    nombre = Column(String)
    estado = Column(String)
    punto = relationship("DBPuntoMapa", back_populates="insumos")

Base.metadata.create_all(bind=engine)

# Modelos Pydantic (Para enviar datos al frontend)
class InsumoBase(BaseModel):
    id: str
    nombre: str
    estado: str
    class Config: from_attributes = True

class PuntoMapaBase(BaseModel):
    id: str
    nombre: str
    tipo: str
    latitud: float
    longitud: float
    direccion: Optional[str] = None
    referencias: Optional[str] = None
    verificado_oficial: bool
    insumos: List[InsumoBase] = []
    class Config: from_attributes = True

# Modelos Pydantic (Para recibir datos del frontend)
class PuntoCrear(BaseModel):
    nombre: str
    tipo: str
    latitud: float
    longitud: float
    direccion: Optional[str] = None
    referencias: Optional[str] = None
    necesidades_texto: Optional[str] = None

class ActualizarEstado(BaseModel):
    nuevo_estado: str

app = FastAPI(title="API Ayuda Venezuela - Terremoto 2026")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=False,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

def inicializar_datos(db: Session):
    # Verificamos si la base de datos está vacía para no duplicar
    if db.query(DBPuntoMapa).first() is None:
        puntos_reales = [
            {
                "nombre": "Calle Páez - Centro de Maracay", "tipo": "derrumbe", "latitud": 10.2469, "longitud": -67.5958,
                "dir": "Aragua", "ref": "Situación: Zona Segura, Sin Novedades",
                "insumos": [{"nombre": "Sin requerimientos inmediatos", "estado": "VERDE"}]
            },
            {
                "nombre": "Hospital Los Samanes - Sur de Maracay", "tipo": "hospital", "latitud": 10.2223, "longitud": -67.5852,
                "dir": "Entregar a familiares de pacientes", "ref": "Atención de Heridos",
                "insumos": [{"nombre": "Guantes", "estado": "ROJO"}, {"nombre": "Mascarillas", "estado": "ROJO"}]
            },
            {
                "nombre": "Los Mangos - Centro de Maracay", "tipo": "derrumbe", "latitud": 10.2501, "longitud": -67.5950,
                "dir": "Los Mangos", "ref": "Preguntar antes de preparar más comida",
                "insumos": [{"nombre": "Hidratación (Agua, Jugos)", "estado": "ROJO"}, {"nombre": "Almuerzos", "estado": "VERDE"}]
            },
            {
                "nombre": "Bosque Lindo - Turmero", "tipo": "derrumbe", "latitud": 10.2286, "longitud": -67.4755,
                "dir": "Maracay San Vicente o Turmero", "ref": "Contacto: 0424-3684107",
                "insumos": [{"nombre": "Cavas grandes", "estado": "ROJO"}, {"nombre": "Guantes de carnaza", "estado": "ROJO"}, {"nombre": "Linternas", "estado": "ROJO"}, {"nombre": "Picos y Mototrozadoras", "estado": "ROJO"}, {"nombre": "Comida e Hidratación", "estado": "VERDE"}]
            },
            {
                "nombre": "Redoma del Mariscal - Cagua", "tipo": "acopio", "latitud": 10.1838, "longitud": -67.4582,
                "dir": "Cagua (Redoma del Mariscal)", "ref": "Centro de Acopio. Contacto: 0414-9121686",
                "insumos": [{"nombre": "Analgésicos y Antibióticos", "estado": "ROJO"}, {"nombre": "Pañales y Fórmulas", "estado": "ROJO"}, {"nombre": "Abrigos y Colchonetas", "estado": "ROJO"}]
            },
            {
                "nombre": "Residencias Oram - Maracay", "tipo": "derrumbe", "latitud": 10.2450, "longitud": -67.5900,
                "dir": "Residencias Oram", "ref": "Remoción de escombros. Contacto: 0424-3684107",
                "insumos": [{"nombre": "Almuerzos", "estado": "VERDE"}]
            },
            {
                "nombre": "Residencias Luis XV - Maracay", "tipo": "derrumbe", "latitud": 10.2480, "longitud": -67.5920,
                "dir": "Residencias Luis XV", "ref": "Remoción de escombros",
                "insumos": [{"nombre": "Abastecidos", "estado": "VERDE"}]
            },
            {
                "nombre": "Residencias el Centro - Maracay Plaza", "tipo": "derrumbe", "latitud": 10.2400, "longitud": -67.5980,
                "dir": "Residencias el Centro", "ref": "Punto: C.C. Maracay Plaza",
                "insumos": [{"nombre": "Hidratación (Agua, Jugos)", "estado": "AMARILLO"}]
            },
            {
                "nombre": "Urb. Andres Bello - Norte de Maracay", "tipo": "derrumbe", "latitud": 10.2700, "longitud": -67.5800,
                "dir": "Urb. Andrés Bello", "ref": "Remoción de escombros",
                "insumos": [{"nombre": "Hidratación (Agua fría)", "estado": "ROJO"}, {"nombre": "Almuerzos", "estado": "VERDE"}]
            },
            {
                "nombre": "La Cooperativa, Sector Bella Vista", "tipo": "acopio", "latitud": 10.2650, "longitud": -67.5750,
                "dir": "Calle 5 de Julio, Casa #03", "ref": "Contacto: 0412-1484881",
                "insumos": [{"nombre": "Ropa de Bebé y Zapatos", "estado": "ROJO"}, {"nombre": "Higiene Personal", "estado": "ROJO"}, {"nombre": "Insumos Médicos", "estado": "ROJO"}]
            },
            {
                "nombre": "Edificio Abitare, La Coromoto", "tipo": "derrumbe", "latitud": 10.2350, "longitud": -67.6100,
                "dir": "Cercanías del Edificio Abitare", "ref": "Referencia: Supermercado Ali Fung. Contacto: 0424-3322445",
                "insumos": [{"nombre": "Antihipertensivos", "estado": "ROJO"}, {"nombre": "Pañales de Adulto", "estado": "ROJO"}, {"nombre": "Complejo B y Analgésicos", "estado": "ROJO"}]
            },
            {
                "nombre": "Morón (Sectores afectados)", "tipo": "derrumbe", "latitud": 10.4851, "longitud": -68.2000,
                "dir": "Carabobo, Morón", "ref": "URGENTE. Damnificados. Sin servicios.",
                "insumos": [{"nombre": "Agua Potable", "estado": "ROJO"}, {"nombre": "Insumos Médicos", "estado": "ROJO"}]
            }
        ]

        for p in puntos_reales:
            nuevo = DBPuntoMapa(
                id=str(uuid.uuid4()), nombre=p["nombre"], tipo=p["tipo"], 
                latitud=p["latitud"], longitud=p["longitud"], 
                direccion=p["dir"], referencias=p["ref"], verificado_oficial=True
            )
            db.add(nuevo)
            db.commit()
            
            # Inyectar los insumos específicos extraídos del Excel
            for insumo in p["insumos"]:
                db.add(DBInsumo(
                    id=str(uuid.uuid4()), punto_id=nuevo.id, 
                    nombre=insumo["nombre"], estado=insumo["estado"]
                ))
        db.commit()

# ⚠️ TEMPORAL: Borrado de base de datos para inyectar la data limpia
@app.on_event("startup")
def on_startup():
    # Eliminar todas las tablas viejas
    Base.metadata.drop_all(bind=engine)
    # Crear tablas desde cero
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    inicializar_datos(db)
    db.close()

@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    inicializar_datos(db)
    db.close()

@app.get("/api/puntos", response_model=List[PuntoMapaBase])
def obtener_puntos(db: Session = Depends(get_db)):
    return db.query(DBPuntoMapa).all()

@app.post("/api/puntos")
def crear_punto(punto: PuntoCrear, db: Session = Depends(get_db)):
    nuevo_id = str(uuid.uuid4())
    nuevo_punto = DBPuntoMapa(
        id=nuevo_id, nombre=punto.nombre, tipo=punto.tipo,
        latitud=punto.latitud, longitud=punto.longitud,
        direccion=punto.direccion, referencias=punto.referencias,
        verificado_oficial=False 
    )
    db.add(nuevo_punto)
    db.commit()
    
    insumos_a_crear = []
    if punto.necesidades_texto:
        texto_limpio = punto.necesidades_texto.replace(" y ", ",").replace(" e ", ",")
        insumos_a_crear = [i.strip().capitalize() for i in texto_limpio.split(",") if i.strip()]
    
    if not insumos_a_crear:
        insumos_a_crear = ["Agua Potable", "Comida", "Insumos Médicos"]

    for i in insumos_a_crear:
        db.add(DBInsumo(id=str(uuid.uuid4()), punto_id=nuevo_id, nombre=i, estado="ROJO"))
    
    db.commit()
    db.refresh(nuevo_punto)
    return nuevo_punto

@app.put("/api/puntos/{punto_id}/insumos/{insumo_id}")
def actualizar_insumo(punto_id: str, insumo_id: str, estado_data: ActualizarEstado, db: Session = Depends(get_db)):
    insumo = db.query(DBInsumo).filter(DBInsumo.id == insumo_id, DBInsumo.punto_id == punto_id).first()
    if not insumo:
        raise HTTPException(status_code=404, detail="Insumo no encontrado")
    
    insumo.estado = estado_data.nuevo_estado
    db.commit()
    return {"mensaje": "Estado actualizado correctamente"}

@app.delete("/api/puntos/{punto_id}")
def eliminar_punto(punto_id: str, db: Session = Depends(get_db)):
    punto = db.query(DBPuntoMapa).filter(DBPuntoMapa.id == punto_id).first()
    if not punto:
        raise HTTPException(status_code=404, detail="Punto no encontrado")
    
    db.delete(punto)
    db.commit()
    return {"mensaje": "Punto eliminado correctamente"}