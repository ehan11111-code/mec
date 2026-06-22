# MEC data intake — how to send data and how it populates the portal

This is the contract for getting **your real MEC data** into the portal. Drop files in the `DATA/`
folder and tell the assistant (or run `/mec-build`) to import them. The portal is frontend-only and
deterministic, so once imported the data renders identically on localhost and on Vercel.

## What's already imported

- **`DATA/بيانات العملاء.xlsx`** → **112 real clients** → `lib/data/clients.ts` (regenerate with
  `node DATA/_gen.js`). Shown on the **Clients (CRM)** page and across the Control Center.

## How to send more data

Put files in `DATA/` in any of these forms — Excel/CSV is easiest, raw documents also work:

| You send | Goes to | Powers |
|---|---|---|
| Clients sheet (Excel/CSV) | `lib/data/clients.ts` | CRM page, top-clients, risk |
| Orders sheet (Excel/CSV) | `lib/data/orders.ts` (new) | Orders page, margins, revenue |
| SKUs / price list | `skus` in `lib/data/dataset.ts` | order items, category mix |
| Inventory / batches | `lib/data/inventory.ts` (new) | warehouse views |
| Payments / receivables | derived from orders, or `lib/data/payments.ts` | finance, overdue |
| Raw docs (PDF/img/WhatsApp) | parsed → matched to a client/order | document center |

### Column mapping that works best (Excel/CSV)

**Clients:** `Customer ID` · `Name (AR)` · `Name (EN)` · `Salesperson` · `Branch` · `Source` ·
`Type` · `Mobile` · `CR number` · `Account number` · `City/Location` · `Active (نعم/لا)`.
(This matches the sheet already imported — headers can be Arabic or English.)

**Orders:** `Order number` · `Customer ID` (must match a client id) · `Status` · `Order date` ·
`Due date` · `SKU/Item` · `Qty` · `Unit price` · `Cost` · `Salesperson`.

**SKUs:** `Code` · `Name (AR/EN)` · `Category` · `Origin country` · `Unit` · `Cost` · `Selling price`.

### Order status values

The portal maps to these (Arabic or English both fine): `under_approval` (قيد الاعتماد) ·
`approved` (معتمَد) · `dispatched` (تم الإرسال) · `on_route` (في الطريق) · `delivered` (تم التسليم) ·
`payment_pending` (بانتظار السداد) · `overdue` (متأخر) · `paid` (مدفوع) · `cancelled` (ملغى).

## Important: what is real vs. derived right now

The clients sheet has **no revenue, risk, orders, city, or per-client salesperson** for most rows.
Until you send orders/payments, those fields are **deterministic placeholders** so the dashboards
aren't empty:

- **Real (from your sheet):** id, names, branch, source, type, CR number, account number, active,
  and the two real reps (عمرو المغربي، محمود سلامة).
- **Derived placeholder (until real data arrives):** city, status, riskScore, totalOrders,
  totalRevenue, overdueAmount, paymentTerms, and all orders/SKUs/payments on the Orders page.

Send an **orders/sales export** next and these become real automatically — the import script wires
order totals → client revenue, payment status → overdue/risk, and the placeholders disappear.

## The import process (what the assistant does)

1. Read the file from `DATA/` (Excel = unzip + parse XML; CSV = parse; docs = extract text).
2. Map columns to the schema above; keep Arabic + English names.
3. Generate/refresh the typed file in `lib/data/` (deterministic, committed).
4. Run `npm run build` (must be green), then commit + push → Vercel redeploys with your data.

> Helper scripts live in `DATA/` (`_parse.js`, `_gen.js`). They are build-time only and are not part
> of the deployed app.
