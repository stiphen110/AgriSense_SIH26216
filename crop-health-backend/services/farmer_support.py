from typing import Optional
from services.supabase import supabase

DISCLAIMER = "Reference information only. Verify current eligibility, deadlines and rules on the official government portal."

def get_schemes(state: Optional[str] = None):
    q = supabase.table("schemes").select("*").eq("is_active", True)
    if state:
        q = q.ilike("state", state)
    return q.order("name").execute().data or []

def get_eligible_schemes(state: Optional[str] = None):
    # The supplied scheme workbook is state-specific, not a complete crop-eligibility engine.
    # Therefore filter by farmer state only; do not invent crop eligibility.
    if not state:
        return []
    return get_schemes(state)

def get_regulations(state: Optional[str] = None):
    q = supabase.table("farmer_regulations").select("*").eq("is_active", True)
    data = q.order("category").order("title").execute().data or []
    if state:
        # State/regional laws in the supplied workbook are broad categories rather than
        # state-by-state rows, so keep all central rules and the supplied state/regional layer.
        return data
    return data

def get_farmer_support(state: Optional[str] = None):
    return {
        "schemes": get_eligible_schemes(state),
        "regulations": get_regulations(state),
        "disclaimer": DISCLAIMER
    }
