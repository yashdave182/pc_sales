from fastapi import APIRouter, Depends, HTTPException
from models import Distributor
from supabase_db import SupabaseClient, get_supabase
from rbac_utils import verify_permission

router = APIRouter()


@router.get("/", dependencies=[Depends(verify_permission("view_distributors"))])
def get_distributors(db: SupabaseClient = Depends(get_supabase)):
    """Get all distributors"""
    try:
        response = (
            db.table("distributors")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )

        if not response.data:
            return []

        return response.data
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching distributors: {str(e)}"
        )


@router.post("/", dependencies=[Depends(verify_permission("create_distributor"))])
def create_distributor(
    distributor: Distributor,
    db: SupabaseClient = Depends(get_supabase),
):
    """Create a new distributor"""
    try:
        distributor_data = {
            "distributor_name": distributor.name,
            "village": distributor.village,
            "taluka": distributor.taluka,
            "district": distributor.district,
            "mantri_name": distributor.mantri_name,
            "mantri_mobile": distributor.mantri_mobile,
            "sabhasad_count": distributor.sabhasad_count,
            "contact_in_group": distributor.contact_in_group,
            "status": distributor.status,
        }

        response = db.table("distributors").insert(distributor_data).execute()

        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create distributor")

        return {
            "message": "Distributor created successfully",
            "distributor": response.data[0],
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error creating distributor: {str(e)}"
        )
