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
    if db.query(DBPuntoMapa).first() is None:
        puntos_reales = [
            {"nombre": "Edificio Petunia", "tipo": "derrumbe", "latitud": 10.498, "longitud": -66.848, "dir": "Altamira", "ref": "Aplasta 5 vehículos, daños graves."},
            {"nombre": "Edificio Juvenal", "tipo": "derrumbe", "latitud": 10.499, "longitud": -66.849, "dir": "Altamira", "ref": "Labores de búsqueda bajo escombros."},
            {"nombre": "Edificio uso mixto (diag. Migas)", "tipo": "derrumbe", "latitud": 10.500, "longitud": -66.850, "dir": "Plaza Altamira", "ref": "Colapso total de la estructura."},
            {"nombre": "Sede Bancaribe", "tipo": "derrumbe", "latitud": 10.490, "longitud": -66.850, "dir": "Caracas", "ref": "Aprox. 50% de la infraestructura colapsada."},
            {"nombre": "Hotel Eduard's", "tipo": "derrumbe", "latitud": 10.600, "longitud": -66.930, "dir": "Playa Grande", "ref": "Reducido a escombros, solo primer piso en pie."},
            {"nombre": "Ritasol Palace", "tipo": "derrumbe", "latitud": 10.601, "longitud": -66.931, "dir": "Playa Grande", "ref": "Estructura colapsada."},
            {"nombre": "Contraloría del Estado", "tipo": "derrumbe", "latitud": 10.598, "longitud": -66.928, "dir": "La Guaira", "ref": "Daños severos en fachada y estructura."},
            {"nombre": "Zona Residencial Playa Grande", "tipo": "derrumbe", "latitud": 10.605, "longitud": -66.935, "dir": "Playa Grande", "ref": "Zona de desastre: +250 edificios afectados."}
        ]

        for p in puntos_reales:
            nuevo = DBPuntoMapa(id=str(uuid.uuid4()), nombre=p["nombre"], tipo=p["tipo"], 
                               latitud=p["latitud"], longitud=p["longitud"], 
                               direccion=p["dir"], referencias=p["ref"], verificado_oficial=True)
            db.add(nuevo)
            db.commit()
            for i in ["Herramientas de Rescate", "Agua Potable", "Personal Médico"]:
                db.add(DBInsumo(id=str(uuid.uuid4()), punto_id=nuevo.id, nombre=i, estado="ROJO"))
        db.commit()

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