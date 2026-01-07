from typing import List, Optional

from pydantic import BaseModel

# ======================
# Customers
# ======================


class Customer(BaseModel):
    customer_id: Optional[int] = None
    customer_code: Optional[str] = None
    name: str
    mobile: Optional[str] = None
    village: Optional[str] = None
    taluka: Optional[str] = None
    district: Optional[str] = None
    status: str = "Active"


# ======================
# Products
# ======================


class Product(BaseModel):
    product_id: Optional[int] = None
    product_name: str
    packing_type: Optional[str] = None
    capacity_ltr: Optional[float] = None
    category: Optional[str] = None
    standard_rate: Optional[float] = None
    is_active: int = 1


# ======================
# Sales
# ======================


class Sale(BaseModel):
    sale_id: Optional[int] = None
    invoice_no: Optional[str] = None
    customer_id: int
    sale_date: str
    total_amount: float = 0
    total_liters: float = 0
    payment_status: str = "Pending"
    notes: Optional[str] = None


class SaleItem(BaseModel):
    product_id: int
    quantity: int
    rate: float
    amount: float


class SaleCreate(BaseModel):
    customer_id: int
    sale_date: str
    items: List[SaleItem]
    notes: Optional[str] = None


# ======================
# Payments
# ======================


class Payment(BaseModel):
    payment_id: Optional[int] = None
    sale_id: int
    payment_date: str
    payment_method: str
    amount: float
    rrn: Optional[str] = None
    reference: Optional[str] = None
    notes: Optional[str] = None


# ======================
# Demos
# ======================


class Demo(BaseModel):
    demo_id: Optional[int] = None
    customer_id: int
    distributor_id: Optional[int] = None
    demo_date: str
    demo_time: str
    product_id: int
    quantity_provided: int
    follow_up_date: Optional[str] = None
    conversion_status: str = "Scheduled"
    notes: Optional[str] = None
    demo_location: Optional[str] = None


# ======================
# Distributors
# ======================


class Distributor(BaseModel):
    distributor_id: Optional[int] = None
    name: str
    village: Optional[str] = None
    taluka: Optional[str] = None
    district: Optional[str] = None
    mantri_name: Optional[str] = None
    mantri_mobile: Optional[str] = None
    sabhasad_count: int = 0
    contact_in_group: int = 0
    status: str = "Active"
