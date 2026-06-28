from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy import create_engine, Column, String, Float, Boolean, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship
import uuid
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ayuda_venezuela.db")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- MODELOS ORM (BASE DE DATOS) ---
class DBPuntoMapa(Base):
    __tablename__ = "puntos"
    id = Column(String, primary_key=True, index=True)
    nombre = Column(String)
    tipo = Column(String)
    latitud = Column(Float)
    longitud = Column(Float)
    direccion = Column(String, nullable=True)
    referencias = Column(String, nullable=True)
    telefono = Column(String, nullable=True) # <--- NUEVO CAMPO
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

# --- MODELOS PYDANTIC (FRONTEND <-> BACKEND) ---
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
    telefono: Optional[str] = None # <--- NUEVO CAMPO
    verificado_oficial: bool
    insumos: List[InsumoBase] = []
    class Config: from_attributes = True

class PuntoCrear(BaseModel):
    nombre: str
    tipo: str
    latitud: float
    longitud: float
    direccion: Optional[str] = None
    referencias: Optional[str] = None
    telefono: Optional[str] = None # <--- NUEVO CAMPO
    insumos_lista: Optional[List[str]] = []

class PuntoUpdate(BaseModel): # <--- NUEVO MODELO PARA EDITAR INFO DEL PUNTO
    nombre: str
    direccion: Optional[str] = None
    referencias: Optional[str] = None
    telefono: Optional[str] = None

class NuevoInsumo(BaseModel):
    nombre: str

class ActualizarEstado(BaseModel):
    nuevo_estado: str

app = FastAPI(title="API Ayuda Venezuela - Emergencia")

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
            {
                "nombre": "Calle Páez - Centro de Maracay", "tipo": "derrumbe", "latitud": 10.2469, "longitud": -67.5958,
                "dir": "Aragua", "ref": "Situación: Zona Segura, Sin Novedades", "tlf": None,
                "insumos": [{"nombre": "Sin requerimientos inmediatos", "estado": "VERDE"}]
            },
            {
                "nombre": "Bosque Lindo - Turmero", "tipo": "derrumbe", "latitud": 10.2286, "longitud": -67.4755,
                "dir": "Maracay San Vicente o Turmero", "ref": "Contacto en el sitio", "tlf": "0424-3684107",
                "insumos": [{"nombre": "Cavas grandes", "estado": "ROJO"}, {"nombre": "Guantes de carnaza", "estado": "ROJO"}, {"nombre": "Comida e Hidratación", "estado": "VERDE"}]
            },
            {
                "nombre": "Redoma del Mariscal - Cagua", "tipo": "acopio", "latitud": 10.1838, "longitud": -67.4582,
                "dir": "Cagua (Redoma del Mariscal)", "ref": "Centro de Acopio", "tlf": "0414-9121686",
                "insumos": [{"nombre": "Analgésicos y Antibióticos", "estado": "ROJO"}, {"nombre": "Abrigos y Colchonetas", "estado": "ROJO"}]
            }
        ]

        for p in puntos_reales:
            nuevo = DBPuntoMapa(
                id=str(uuid.uuid4()), nombre=p["nombre"], tipo=p["tipo"], 
                latitud=p["latitud"], longitud=p["longitud"], 
                direccion=p["dir"], referencias=p["ref"], telefono=p.get("tlf"),
                verificado_oficial=True
            )
            db.add(nuevo)
            db.commit()
            for insumo in p["insumos"]:
                db.add(DBInsumo(id=str(uuid.uuid4()), punto_id=nuevo.id, nombre=insumo["nombre"], estado=insumo["estado"]))
        db.commit()

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    inicializar_datos(db)
    db.close()

# --- RUTAS DE LA API ---

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
        telefono=punto.telefono, verificado_oficial=False 
    )
    db.add(nuevo_punto)
    db.commit()
    
    insumos_a_crear = punto.insumos_lista or []
    for i in insumos_a_crear:
        db.add(DBInsumo(id=str(uuid.uuid4()), punto_id=nuevo_id, nombre=i, estado="ROJO"))
    
    db.commit()
    db.refresh(nuevo_punto)
    return nuevo_punto

# NUEVA RUTA PARA EDITAR LA INFO PRINCIPAL DEL PUNTO
@app.put("/api/puntos/{punto_id}")
def editar_info_punto(punto_id: str, datos: PuntoUpdate, db: Session = Depends(get_db)):
    punto = db.query(DBPuntoMapa).filter(DBPuntoMapa.id == punto_id).first()
    if not punto:
        raise HTTPException(status_code=404, detail="Punto no encontrado")
    
    punto.nombre = datos.nombre
    punto.direccion = datos.direccion
    punto.referencias = datos.referencias
    punto.telefono = datos.telefono
    
    db.commit()
    db.refresh(punto)
    return {"mensaje": "Información del punto actualizada", "punto": punto}

@app.post("/api/puntos/{punto_id}/insumos")
def agregar_insumo_a_punto(punto_id: str, insumo: NuevoInsumo, db: Session = Depends(get_db)):
    punto = db.query(DBPuntoMapa).filter(DBPuntoMapa.id == punto_id).first()
    if not punto:
        raise HTTPException(status_code=404, detail="Punto no encontrado")
    nuevo_insumo = DBInsumo(id=str(uuid.uuid4()), punto_id=punto_id, nombre=insumo.nombre, estado="ROJO")
    db.add(nuevo_insumo)
    db.commit()
    return {"mensaje": "Requerimiento agregado correctamente"}

@app.put("/api/puntos/{punto_id}/insumos/{insumo_id}")
def actualizar_insumo(punto_id: str, insumo_id: str, estado_data: ActualizarEstado, db: Session = Depends(get_db)):
    insumo = db.query(DBInsumo).filter(DBInsumo.id == insumo_id, DBInsumo.punto_id == punto_id).first()
    if not insumo:
        raise HTTPException(status_code=404, detail="Insumo no encontrado")
    insumo.estado = estado_data.nuevo_estado
    db.commit()
    return {"mensaje": "Estado actualizado"}

@app.delete("/api/puntos/{punto_id}/insumos/{insumo_id}")
def eliminar_insumo(punto_id: str, insumo_id: str, db: Session = Depends(get_db)):
    insumo = db.query(DBInsumo).filter(DBInsumo.id == insumo_id, DBInsumo.punto_id == punto_id).first()
    if not insumo:
        raise HTTPException(status_code=404, detail="Insumo no encontrado")
    db.delete(insumo)
    db.commit()
    return {"mensaje": "Insumo eliminado"}

@app.delete("/api/puntos/{punto_id}")
def eliminar_punto(punto_id: str, db: Session = Depends(get_db)):
    punto = db.query(DBPuntoMapa).filter(DBPuntoMapa.id == punto_id).first()
    if not punto:
        raise HTTPException(status_code=404, detail="Punto no encontrado")
    db.delete(punto)
    db.commit()
    return {"mensaje": "Punto eliminado"}