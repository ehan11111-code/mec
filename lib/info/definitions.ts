// Definitions + SOURCE REFERENCE + LAST-UPDATE for every metric/figure shown in the portal. Each (i)
// info icon reads from here so the user always sees (a) what the number means, (b) exactly where it comes
// from — a file, a JARVIS-derived calculation, or an external reference — and (c) when it was last
// updated. Bilingual EN/AR.
import { CREDIT_AS_OF } from '@/lib/data/credit'
import { INVENTORY_COUNT_AS_OF } from '@/lib/data/inventory-count'

export type Bi = { en: string; ar: string }
export type Def = { def: Bi; source: Bi; updated?: Bi }

// ── When each data source was last updated (shown under "Last update" in every (i) tooltip) ──
// Imported spreadsheets — refreshed when a new workbook is dropped + regenerated.
const DATA_UPDATED: Bi = { en: 'Last data import: sales & procurement workbooks covering Oct 2025 – Jun 2026.', ar: 'آخر استيراد للبيانات: ملفات المبيعات والمشتريات تغطي أكتوبر 2025 – يونيو 2026.' }
// Live tables written by the n8n workflows — current as of the moment the page loads.
const LIVE_UPDATED: Bi = { en: 'Live — refreshed every time the page loads and on each workflow run.', ar: 'مباشر — يُحدَّث عند كل تحميل للصفحة وعند كل تشغيل لسير العمل.' }
// Tarek's المديونية / المخزون WhatsApp statements — refresh when a newer file arrives + auto-extract.
const CREDIT_UPDATED: Bi = { en: `As of the latest المديونية (credit) statement — ${CREDIT_AS_OF}. Refreshes automatically when Tarek sends a new one.`, ar: `حتى آخر كشف مديونية — ${CREDIT_AS_OF}. يُحدَّث تلقائيًا عند إرسال طارق كشفًا جديدًا.` }
const INV_UPDATED: Bi = { en: `Ledger through Jun 2026; Tarek's المخزون movement file as of ${INVENTORY_COUNT_AS_OF}. Refreshes on each new file.`, ar: `السجل حتى يونيو 2026؛ ملف حركة المخزون من طارق حتى ${INVENTORY_COUNT_AS_OF}. يُحدَّث عند كل ملف جديد.` }

const SALES_SRC: Bi = { en: 'Source file: مبيعات Q4-2025 / Q1-2026 / Q2-2026.xlsx (sales invoices, Oct 2025–Jun 2026).', ar: 'ملف المصدر: مبيعات الربع الرابع 2025 / الأول 2026 / الثاني 2026.xlsx (فواتير المبيعات، أكتوبر 2025–يونيو 2026).' }
const PURCH_SRC: Bi = { en: 'Source: the المشتريات (procurement) sheet inside the sales workbooks.', ar: 'المصدر: ورقة المشتريات داخل ملفات المبيعات.' }
const CLIENTS_SRC: Bi = { en: 'Source file: بيانات العملاء.xlsx (ERP client export, 112 clients).', ar: 'ملف المصدر: بيانات العملاء.xlsx (تصدير العملاء من ERP، 112 عميلًا).' }
const DERIVED: Bi = { en: 'Derived by JARVIS analytics from the sales & procurement workbooks.', ar: 'محسوب بواسطة تحليلات جارفيس من ملفات المبيعات والمشتريات.' }

export const DEFS: Record<string, Def> = {
  revenue: { def: { en: 'Total sales value including 15% VAT, summed from invoice lines.', ar: 'إجمالي قيمة المبيعات شاملة ضريبة 15%، مجموعة من بنود الفواتير.' }, source: { en: SALES_SRC.en + ' Field: المبلغ بعد الضريبة.', ar: SALES_SRC.ar + ' الحقل: المبلغ بعد الضريبة.' } },
  procurement: { def: { en: 'Total amount spent buying stock from suppliers (incl. VAT).', ar: 'إجمالي المبلغ المنفق على شراء البضائع من الموردين (شامل الضريبة).' }, source: PURCH_SRC },
  grossProfit: { def: { en: 'Estimated gross profit = total sales revenue − total procurement spend.', ar: 'الربح الإجمالي التقديري = إجمالي إيراد المبيعات − إجمالي إنفاق المشتريات.' }, source: DERIVED },
  receivables: { def: { en: 'Sales value not yet marked collected — money clients still owe.', ar: 'قيمة المبيعات غير المُحصّلة بعد — أموال ما زال العملاء مدينين بها.' }, source: { en: SALES_SRC.en + ' Field: حالة التحصيل.', ar: SALES_SRC.ar + ' الحقل: حالة التحصيل.' } },
  invoices: { def: { en: 'Count of sales invoice lines in the selected period.', ar: 'عدد بنود فواتير المبيعات في الفترة المحددة.' }, source: SALES_SRC },
  clients: { def: { en: 'Distinct clients that appear in the sales invoices.', ar: 'العملاء المختلفون الذين يظهرون في فواتير المبيعات.' }, source: SALES_SRC },
  vat: { def: { en: 'Value-added tax (15%) charged on the sales.', ar: 'ضريبة القيمة المضافة (15%) المحتسبة على المبيعات.' }, source: { en: SALES_SRC.en + ' Field: الضريبة.', ar: SALES_SRC.ar + ' الحقل: الضريبة.' } },
  avgInvoice: { def: { en: 'Average value per invoice = revenue ÷ number of invoices.', ar: 'متوسط قيمة الفاتورة = الإيراد ÷ عدد الفواتير.' }, source: DERIVED },
  suppliers: { def: { en: 'Distinct suppliers MEC purchased from.', ar: 'الموردون المختلفون الذين اشترت منهم MEC.' }, source: PURCH_SRC },
  purchaseLines: { def: { en: 'Count of procurement line items.', ar: 'عدد بنود الشراء.' }, source: PURCH_SRC },
  collected: { def: { en: 'Sales value marked as collected (تم) from clients.', ar: 'قيمة المبيعات المعلّمة كمُحصّلة (تم) من العملاء.' }, source: { en: SALES_SRC.en + ' Field: حالة التحصيل.', ar: SALES_SRC.ar + ' الحقل: حالة التحصيل.' } },
  outstanding: { def: { en: 'Sales value still uncollected (receivables).', ar: 'قيمة المبيعات غير المُحصّلة (المستحقات).' }, source: { en: SALES_SRC.en + ' Field: حالة التحصيل.', ar: SALES_SRC.ar + ' الحقل: حالة التحصيل.' } },
  cash: { def: { en: 'Sales paid in cash.', ar: 'المبيعات المدفوعة نقدًا.' }, source: { en: SALES_SRC.en + ' Field: كاش / تحويل بنكي.', ar: SALES_SRC.ar + ' الحقل: كاش / تحويل بنكي.' } },
  bank: { def: { en: 'Sales paid by bank transfer.', ar: 'المبيعات المدفوعة بتحويل بنكي.' }, source: { en: SALES_SRC.en + ' Field: كاش / تحويل بنكي.', ar: SALES_SRC.ar + ' الحقل: كاش / تحويل بنكي.' } },
  margin: { def: { en: 'Gross margin % = (avg sell price − avg buy cost) ÷ avg sell price, per category.', ar: 'نسبة الهامش = (متوسط سعر البيع − متوسط تكلفة الشراء) ÷ متوسط سعر البيع، لكل فئة.' }, source: DERIVED },
  grossProfitActual: { def: { en: 'Actual gross profit per product = (sell price per carton − that product’s matched purchase cost per carton) × cartons sold, pre-VAT.', ar: 'الربح الفعلي لكل منتج = (سعر البيع للكرتون − تكلفة الشراء المطابقة للكرتون) × عدد الكراتين المباعة، قبل الضريبة.' }, source: { en: 'Derived by JARVIS: each sales product matched by name to its purchase line. Sources: ' + SALES_SRC.en + ' ' + PURCH_SRC.en, ar: 'محسوب بواسطة جارفيس: كل منتج مبيعات مطابق بالاسم لبند شرائه. المصادر: ' + SALES_SRC.ar + ' ' + PURCH_SRC.ar } },
  overallMargin: { def: { en: 'Total gross profit ÷ total revenue across all priced products (pre-VAT).', ar: 'إجمالي الربح ÷ إجمالي الإيراد عبر كل المنتجات المسعّرة (قبل الضريبة).' }, source: DERIVED },
  belowMinCount: { def: { en: 'Products whose actual margin is below MEC’s minimum floor (meat 3%, chicken 5%, vegetables 6%, potatoes 10%).', ar: 'المنتجات التي يقل هامشها الفعلي عن الحد الأدنى لـ MEC (لحوم 3٪، دجاج 5٪، خضروات 6٪، بطاطس 10٪).' }, source: DERIVED },
  avgSell: { def: { en: 'Average sell unit price for the category (from sales).', ar: 'متوسط سعر بيع الوحدة للفئة (من المبيعات).' }, source: SALES_SRC },
  avgCost: { def: { en: 'Average buy unit cost for the category (from purchases).', ar: 'متوسط تكلفة شراء الوحدة للفئة (من المشتريات).' }, source: PURCH_SRC },
  clientsTotal: { def: { en: 'All clients that transacted with MEC — the ERP client file plus any client seen only in the sales data (so every sale is attributed to a client).', ar: 'كل العملاء الذين تعاملوا مع MEC — ملف عملاء ERP بالإضافة إلى أي عميل ظهر في بيانات المبيعات فقط (لتُنسب كل عملية بيع إلى عميل).' }, source: { en: CLIENTS_SRC.en + ' + ' + SALES_SRC.en, ar: CLIENTS_SRC.ar + ' + ' + SALES_SRC.ar } },
  overdue: { def: { en: 'Uncollected balance for the client (sales not marked collected).', ar: 'الرصيد غير المُحصّل للعميل (مبيعات غير معلّمة كمحصّلة).' }, source: { en: CLIENTS_SRC.en + ' Joined with ' + SALES_SRC.en, ar: CLIENTS_SRC.ar + ' مدموج مع ' + SALES_SRC.ar } },
  atRisk: { def: { en: 'Clients with a risk score ≥ 60% (high uncollected ratio).', ar: 'العملاء بدرجة مخاطر ≥ 60% (نسبة تحصيل منخفضة).' }, source: DERIVED },
  riskScore: { def: { en: 'Risk score = share of the client’s sales still uncollected, scaled 0–95.', ar: 'درجة المخاطر = نسبة مبيعات العميل غير المُحصّلة، على مقياس 0–95.' }, source: DERIVED },
  ordersTotal: { def: { en: 'Total orders (one per sales invoice).', ar: 'إجمالي الطلبات (واحد لكل فاتورة مبيعات).' }, source: SALES_SRC },
  openOrders: { def: { en: 'Orders awaiting payment (not yet collected).', ar: 'الطلبات بانتظار السداد (لم تُحصّل بعد).' }, source: SALES_SRC },
  orderValue: { def: { en: 'Total value of all orders (incl. VAT).', ar: 'إجمالي قيمة كل الطلبات (شاملة الضريبة).' }, source: SALES_SRC },
  avgMargin: { def: { en: 'Average gross margin % across orders (by product category).', ar: 'متوسط نسبة الهامش عبر الطلبات (حسب فئة المنتج).' }, source: DERIVED },
  topClients: { def: { en: 'Clients ranked by total sales revenue in the period.', ar: 'العملاء مرتّبون حسب إجمالي إيراد المبيعات في الفترة.' }, source: SALES_SRC },
  category: { def: { en: 'Product family (Beef, Poultry, Lamb, Processed, Dairy, Vegetables) auto-classified from the Arabic item name.', ar: 'عائلة المنتج (لحوم، دواجن، غنم، مصنّعة، ألبان، خضروات) مصنّفة تلقائيًا من اسم الصنف.' }, source: { en: 'Classified by JARVIS from ' + SALES_SRC.en, ar: 'مصنّفة بواسطة جارفيس من ' + SALES_SRC.ar } },
  salesperson: { def: { en: 'Sales attributed to each salesperson; unattributed invoices are grouped as “Unassigned”.', ar: 'المبيعات المنسوبة لكل مندوب؛ الفواتير غير المنسوبة تُجمع كـ«غير محدد».' }, source: { en: SALES_SRC.en + ' Field: المندوب.', ar: SALES_SRC.ar + ' الحقل: المندوب.' } },
  supplyIntelFeed: { def: { en: 'Suppliers / sourcing countries currently monitored by the supply-market intelligence workflow.', ar: 'الموردون / بلدان التوريد المُراقَبة حاليًا بواسطة تدفّق استخبارات سوق التوريد.' }, source: { en: 'Live from Supabase supply_intel (written by the n8n Supply-Market Intelligence workflow every 12h).', ar: 'مباشر من Supabase supply_intel (يكتبه تدفّق استخبارات سوق التوريد كل 12 ساعة).' } },
  supplyRisks: { def: { en: 'Total active risk signals across all suppliers in the latest scan.', ar: 'إجمالي إشارات المخاطر النشطة عبر كل الموردين في آخر فحص.' }, source: { en: 'Derived by JARVIS from recent news + advisory feeds; unsourced claims are dropped.', ar: 'محسوب بواسطة جارفيس من الأخبار والتنبيهات الحديثة؛ وتُحذف الادعاءات بلا مصدر.' } },
  supplyHigh: { def: { en: 'Risk signals rated high severity — likely to disrupt supply, price or transport soon.', ar: 'إشارات المخاطر المصنّفة عالية الخطورة — قد تعطّل التوريد أو السعر أو النقل قريبًا.' }, source: { en: 'Derived by JARVIS from the gathered sources.', ar: 'محسوب بواسطة جارفيس من المصادر المجمّعة.' } },
  supplyUpdated: { def: { en: 'Timestamp of the most recent intelligence refresh (runs every 12 hours).', ar: 'وقت آخر تحديث للاستخبارات (يعمل كل 12 ساعة).' }, source: { en: 'Supabase supply_intel.generated_at.', ar: 'Supabase supply_intel.generated_at.' } },
  supplyLead: { def: { en: 'Average estimated sea-freight lead time from sourcing countries to a Saudi port, raised when sources report port delays.', ar: 'متوسط زمن الشحن البحري المقدّر من بلدان التوريد إلى ميناء سعودي، يرتفع عند ورود تقارير عن تأخّر الموانئ.' }, source: { en: 'Estimated by JARVIS per country; adjusted from the gathered sources.', ar: 'مقدّر بواسطة جارفيس لكل بلد؛ معدّل من المصادر المجمّعة.' } },
  waMessages: { def: { en: 'Inbound WhatsApp messages received from clients via WaSender.', ar: 'رسائل واتساب الواردة من العملاء عبر WaSender.' }, source: { en: 'Live from Supabase whatsapp_intake (written by the n8n WhatsApp Intake workflow).', ar: 'مباشر من Supabase whatsapp_intake (يكتبه تدفّق استقبال واتساب).' } },
  waOrders: { def: { en: 'Messages JARVIS classified as an order (vs inquiry / complaint / other).', ar: 'الرسائل التي صنّفها جارفيس كطلب (مقابل استفسار / شكوى / أخرى).' }, source: { en: 'Classified by JARVIS (gpt-4o-mini) from the message text.', ar: 'مصنّفة بواسطة جارفيس (gpt-4o-mini) من نص الرسالة.' } },
  productsBought: { def: { en: 'Number of distinct products this client has purchased across all their invoices.', ar: 'عدد المنتجات المختلفة التي اشتراها هذا العميل عبر كل فواتيره.' }, source: SALES_SRC },
  units: { def: { en: 'Total cartons / units sold to this client across all invoices.', ar: 'إجمالي الكراتين / الوحدات المباعة لهذا العميل عبر كل الفواتير.' }, source: SALES_SRC },
  onHand: { def: { en: 'Cartons in the warehouse now. On-hand is the JARVIS reconciled figure (warehouse ledger net of recorded in/out, excluding unbalanced SKUs). Switch the source with the icons: reconciled on-hand, available-after-open-orders, or Tarek’s المخزون file — which is inventory MOVEMENT (cartons moved per item up to a date), NOT stock, so its total can exceed capacity.', ar: 'الكراتين في المستودع الآن. المتوفر هو رقم جارفيس المُسوّى (صافي سجل المستودع وارد/صادر، باستثناء الأصناف غير المتوازنة). بدّل المصدر بالأيقونات: المتوفر المُسوّى، أو المتاح بعد الطلبات، أو ملف طارق (المخزون) — وهو حركة المخزون (كراتين تحرّكت لكل صنف حتى تاريخ) لا الرصيد، لذا قد يتجاوز إجماليه السعة.' }, source: { en: 'Warehouse ledger (المخزون 2026, net on-hand) + Tarek’s المخزون movement file + live open orders from whatsapp_intake.', ar: 'سجل المستودع (المخزون 2026، صافي المتوفر) + ملف حركة المخزون من طارق + الطلبات المفتوحة من whatsapp_intake.' } },
  creditLimit: { def: { en: 'Indicative credit line. The limit is derived from the client’s peak monthly purchasing (×2) until MEC’s finance system supplies real limits; “used” is the client’s actual uncollected balance and is real.', ar: 'حد ائتماني استرشادي. السقف مشتق من أعلى مشتريات شهرية للعميل (×2) حتى يوفّر نظام المالية الحدود الفعلية؛ و«المستخدم» هو الرصيد غير المُحصّل الفعلي وهو حقيقي.' }, source: { en: 'Used balance: ' + SALES_SRC.en + ' Limit: derived by JARVIS (pending finance data).', ar: 'الرصيد المستخدم: ' + SALES_SRC.ar + ' السقف: محسوب بواسطة جارفيس (بانتظار بيانات المالية).' } }
}

// Metrics whose "last update" isn't the default spreadsheet import.
const LIVE_IDS = new Set(['supplyIntelFeed', 'supplyRisks', 'supplyHigh', 'supplyUpdated', 'supplyLead', 'waMessages', 'waOrders'])
const CREDIT_IDS = new Set(['receivables', 'outstanding', 'overdue', 'creditLimit'])
const INV_IDS = new Set(['onHand', 'stockValue', 'reorder', 'expiry', 'skus'])

function updatedFor(id: string): Bi {
  if (LIVE_IDS.has(id)) return LIVE_UPDATED
  if (CREDIT_IDS.has(id)) return CREDIT_UPDATED
  if (INV_IDS.has(id)) return INV_UPDATED
  return DATA_UPDATED
}

// Returns the definition with its `updated` line guaranteed (explicit on the entry, else inferred from
// the metric's data source) — so every (i) tooltip can show source + last update.
export function getDef(id: string): Def | undefined {
  const e = DEFS[id]
  if (!e) return undefined
  return e.updated ? e : { ...e, updated: updatedFor(id) }
}
