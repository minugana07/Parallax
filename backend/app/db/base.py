"""
Database metadata registration and schema initialization.
"""
from app.db.session import Base, engine, SessionLocal
# Import all models to ensure they are registered on the Base metadata
import app.models  # noqa: F401
from app.db.demo_seed import seed_demo_data
from app.db.migrations import run_safe_migrations


def init_db(seed_demo: bool = True) -> None:
    """
    Initializes the database schema by creating all registered tables.
    Applies safe column migrations first, then seeds demo data if necessary.
    """
    Base.metadata.create_all(bind=engine)
    # Apply safe migrations and ensure teacher ownership columns are set up first
    run_safe_migrations()

    if seed_demo:
        db = SessionLocal()
        try:
            seed_demo_data(db)
        finally:
            db.close()
        # Run safe migrations again to link any newly seeded records to demo user if needed
        run_safe_migrations()


