from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy import create_engine, Column, String, Float, Boolean, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship
import uuid

# Configuración de base de datos
SQLALCHEMY_DATABASE_URL = "sqlite:///./ayuda_venezuela.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

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

# Modelos Pydantic
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

app = FastAPI(title="API Ayuda Venezuela - Terremoto 2026")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

def inicializar_datos(db: Session):
    if db.query(DBPuntoMapa).first() is None:
        puntos_reales = [
            # Caracas
            {"nombre": "Edificio Petunia", "tipo": "derrumbe", "latitud": 10.498, "longitud": -66.848, "dir": "Altamira", "ref": "Aplasta 5 vehículos, daños graves."},
            {"nombre": "Edificio Juvenal", "tipo": "derrumbe", "latitud": 10.499, "longitud": -66.849, "dir": "Altamira", "ref": "Labores de búsqueda bajo escombros."},
            {"nombre": "Edificio uso mixto (diag. Migas)", "tipo": "derrumbe", "latitud": 10.500, "longitud": -66.850, "dir": "Plaza Altamira", "ref": "Colapso total de la estructura."},
            {"nombre": "Sede Bancaribe", "tipo": "derrumbe", "latitud": 10.490, "longitud": -66.850, "dir": "Caracas", "ref": "Aprox. 50% de la infraestructura colapsada."},
            # La Guaira
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
            # Insumos críticos iniciales
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