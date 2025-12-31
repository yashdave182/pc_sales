from contextlib import asynccontextmanager

from database import init_db
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import (
    admin,
    analytics,
    customers,
    dashboard,
    demos,
    distributors,
    imports,
    payments,
    products,
    reports,
    sales,
)
from routers.automation import router as automation


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Sales Management API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "Sales Management API running"}


app.include_router(customers, prefix="/api/customers")
app.include_router(products, prefix="/api/products")
app.include_router(sales, prefix="/api/sales")
app.include_router(payments, prefix="/api/payments")
app.include_router(demos, prefix="/api/demos")
app.include_router(distributors, prefix="/api/distributors")
app.include_router(dashboard, prefix="/api/dashboard")
app.include_router(reports, prefix="/api/reports")
app.include_router(analytics, prefix="/api/analytics")
app.include_router(admin, prefix="/api/admin")
app.include_router(imports, prefix="/api/imports")
app.include_router(automation, prefix="/api/automation")
