"""
House of Tailors — QR Scanner Station (Streamlit)
Fixed-station scanner for workbenches with USB QR scanner or webcam.
Run: streamlit run app.py
"""

import streamlit as st
import os
import uuid
from datetime import datetime, timezone

try:
    from supabase import create_client, Client
except ImportError:
    st.error("Run: pip install -r requirements.txt")
    st.stop()

# ── Config ────────────────────────────────────────────────────────
SUPABASE_URL  = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY  = os.environ.get("SUPABASE_SERVICE_KEY", "")  # service role key for station

POSITION_STAGE_MAP: dict[str, list[str]] = {
    "SALES_STAFF":           ["MEASUREMENT", "TRIAL"],
    "LEAD_MANAGEMENT_STAFF": ["MEASUREMENT", "TRIAL"],
    "PURCHASE_STAFF":        ["FABRIC_ORDERING", "FABRIC_COLLECTED"],
    "PRODUCTION_IN_CHARGE":  ["CUTTING", "SEMI_STITCH", "FINAL_STITCH", "PENDING_ALTERATION"],
    "MASTER":                ["CUTTING"],
    "TAILOR":                ["SEMI_STITCH", "FINAL_STITCH"],
    "QUALITY_CHECK":         ["TRIAL", "READY_FOR_DELIVERY", "PENDING_ALTERATION", "READY_FINAL_DELIVERY"],
    "LOGISTICS_COORDINATOR": ["DELIVERED", "ORDER_CLOSED"],
}

STATUS_LABELS: dict[str, str] = {
    "MEASUREMENT":         "Measurement",
    "FABRIC_ORDERING":     "Fabric Ordering",
    "FABRIC_COLLECTED":    "Fabric Collected",
    "CUTTING":             "Cutting",
    "SEMI_STITCH":         "Semi Stitch",
    "TRIAL":               "Trial",
    "FINAL_STITCH":        "Final Stitch",
    "READY_FOR_DELIVERY":  "Ready for Delivery",
    "DELIVERED":           "Delivered",
    "PENDING_ALTERATION":  "Pending Alteration",
    "READY_FINAL_DELIVERY":"Ready Final Delivery",
    "ORDER_CLOSED":        "Order Closed",
}

# ── Supabase client ───────────────────────────────────────────────
@st.cache_resource
def get_supabase() -> "Client":
    if not SUPABASE_URL or not SUPABASE_KEY:
        st.error("Set SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env file")
        st.stop()
    return create_client(SUPABASE_URL, SUPABASE_KEY)

# ── Session state ─────────────────────────────────────────────────
if "user"      not in st.session_state: st.session_state.user      = None
if "last_scan" not in st.session_state: st.session_state.last_scan = None

# ── Page config ───────────────────────────────────────────────────
st.set_page_config(page_title="HT Scanner", page_icon="✂️", layout="centered")
sb: Client = get_supabase()

# ── Login screen ──────────────────────────────────────────────────
if not st.session_state.user:
    st.markdown("## ✂️ House of Tailors — Scanner Station")
    st.markdown("---")
    with st.form("login_form"):
        email    = st.text_input("Email",    placeholder="staff@houseoftailors.com")
        password = st.text_input("Password", type="password")
        login    = st.form_submit_button("Login", use_container_width=True, type="primary")

    if login:
        if not email or not password:
            st.error("Enter email and password")
        else:
            try:
                resp = sb.auth.sign_in_with_password({"email": email, "password": password})
                if resp.user:
                    row = sb.table("User").select("id, name, position, role, isActive") \
                          .eq("email", email).maybe_single().execute()
                    if row.data and row.data.get("isActive"):
                        st.session_state.user = row.data
                        st.rerun()
                    else:
                        st.error("Account not found or inactive in the system")
                else:
                    st.error("Invalid credentials")
            except Exception as e:
                st.error(f"Login failed: {e}")
    st.stop()

# ── Main scanner screen ───────────────────────────────────────────
user     = st.session_state.user
position = user.get("position")
role     = user.get("role", "STAFF")

if role == "ADMIN":
    allowed_stages = list(STATUS_LABELS.keys())
else:
    allowed_stages = POSITION_STAGE_MAP.get(position or "", [])

# Header
col_title, col_logout = st.columns([4, 1])
with col_title:
    st.markdown(f"## ✂️ Scanner Station")
    st.caption(f"👤 **{user.get('name', 'Staff')}**  ·  {(position or 'No position').replace('_', ' ')}")
with col_logout:
    st.write("")
    if st.button("Logout", use_container_width=True):
        sb.auth.sign_out()
        st.session_state.user      = None
        st.session_state.last_scan = None
        st.rerun()

st.divider()

# No stages warning
if not allowed_stages:
    st.warning("⚠️ No workflow stages are assigned to your position. Ask your admin.")
    st.stop()

# Your stages
with st.expander("Your assigned stages", expanded=False):
    st.write("  ·  ".join(STATUS_LABELS.get(s, s) for s in allowed_stages))

st.subheader("Scan Order")
st.info(
    "Use a USB QR scanner (plugs in like a keyboard) — it will type the order ID automatically. "
    "Or paste the order URL/ID below.",
    icon="📷"
)

# Stage selector (shown when multiple stages possible)
target_stage = None
if len(allowed_stages) > 1:
    target_stage = st.selectbox(
        "Set stage to:",
        allowed_stages,
        format_func=lambda s: STATUS_LABELS.get(s, s),
    )
else:
    target_stage = allowed_stages[0]
    st.info(f"Will advance order to: **{STATUS_LABELS.get(target_stage, target_stage)}**")

# Scan input form
with st.form("scan_form", clear_on_submit=True):
    raw_input = st.text_input(
        "QR Code or Order ID",
        placeholder="Scan QR here or paste order ID / URL...",
        label_visibility="collapsed",
    )
    submitted = st.form_submit_button("✅  Process Scan", use_container_width=True, type="primary")

if submitted and raw_input.strip():
    raw = raw_input.strip()

    # Extract order ID from URL if needed
    if "/scan/" in raw:
        order_id = raw.split("/scan/")[-1].strip("/").split("?")[0]
    else:
        order_id = raw

    with st.spinner("Updating order..."):
        try:
            # Fetch order
            order_res = sb.table("Order") \
                .select("id, orderNumber, status, garmentType, customerId, totalAmount, advanceAmount") \
                .eq("id", order_id).eq("isActive", True).maybe_single().execute()

            if not order_res.data:
                st.error(f"❌ Order not found: {order_id}")
            else:
                order = order_res.data

                # Fetch customer name
                cust = sb.table("Customer").select("name") \
                    .eq("id", order["customerId"]).maybe_single().execute()
                customer_name = cust.data["name"] if cust.data else "Unknown"

                old_status = order["status"]
                now = datetime.now(timezone.utc).isoformat()

                # Update order status
                sb.table("Order").update({"status": target_stage, "updatedAt": now}) \
                    .eq("id", order_id).execute()

                # Insert history
                sb.table("OrderHistory").insert({
                    "id":        str(uuid.uuid4()),
                    "orderId":   order_id,
                    "status":    target_stage,
                    "notes":     f"Advanced via scanner station by {user.get('name', 'staff')}",
                    "changedBy": user["id"],
                    "changedAt": now,
                }).execute()

                # Activity log
                sb.table("ActivityLog").insert({
                    "id":          str(uuid.uuid4()),
                    "userId":      user["id"],
                    "customerId":  order["customerId"],
                    "orderId":     order_id,
                    "action":      "STATUS_UPDATE",
                    "entity":      "Order",
                    "entityId":    order_id,
                    "description": f'Order "{order["orderNumber"]}" → {target_stage} via scanner station',
                    "metadata":    {"status": target_stage, "scannedBy": user["id"], "position": position},
                }).execute()

                st.session_state.last_scan = {
                    "orderNumber":  order["orderNumber"],
                    "customerName": customer_name,
                    "garmentType":  order["garmentType"],
                    "oldStatus":    old_status,
                    "newStatus":    target_stage,
                    "total":        order.get("totalAmount", 0),
                    "advance":      order.get("advanceAmount", 0),
                }
                st.rerun()

        except Exception as e:
            st.error(f"❌ Error: {e}")

# Last scan result
if st.session_state.last_scan:
    scan = st.session_state.last_scan
    st.success("✅ Order updated successfully!")
    with st.container(border=True):
        st.markdown(f"### {scan['orderNumber']}")
        col1, col2 = st.columns(2)
        with col1:
            st.markdown(f"**Customer:** {scan['customerName']}")
            st.markdown(f"**Garment:** {scan['garmentType']}")
        with col2:
            old_lbl = STATUS_LABELS.get(scan['oldStatus'], scan['oldStatus'])
            new_lbl = STATUS_LABELS.get(scan['newStatus'], scan['newStatus'])
            st.markdown(f"**Stage:** ~~{old_lbl}~~ → **{new_lbl}**")
            bal = scan['total'] - scan['advance']
            if bal > 0:
                st.markdown(f"**Balance due:** AED {bal:,.0f}")
    if st.button("Clear", use_container_width=True):
        st.session_state.last_scan = None
        st.rerun()
