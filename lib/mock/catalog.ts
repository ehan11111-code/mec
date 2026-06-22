import type { Bi, NodeKind } from './types'

export type SolutionSeed = {
  slug: string; name: Bi; context: Bi; systems: string[]
  kpiSeeds: { label: Bi; format: 'int' | 'pct' | 'sar' | 'ms' | 'hrs'; range: [number, number]; highlight?: boolean }[]
  chartTitle: Bi; chartA: Bi; chartB: Bi
  workflow: { id: string; label: Bi; kind: NodeKind }[]   // 2×source, 1×agent, 1×integration, 1×output
  decisionTemplates: Bi[]                                  // {n}/{m}/{q} placeholders
  interventionTemplates: Bi[]
  activityTemplates: Bi[]
}
export type DepartmentSeed = {
  slug: string; name: Bi; contextLine: Bi
  kpiSeeds: { label: Bi; format: 'int' | 'pct' | 'sar' | 'ms' | 'hrs'; range: [number, number]; highlight?: boolean }[]
  solutions: SolutionSeed[]
}
const std = (id: string, en: string, ar: string, kind: NodeKind) => ({ id, label: { en, ar }, kind })
const baseWorkflow = (sA: string, sAa: string, sB: string, sBa: string, ag: string, aga: string, ig: string, iga: string, o: string, oa: string) => [
  std('s1', sA, sAa, 'source'), std('s2', sB, sBa, 'source'), std('a1', ag, aga, 'agent'),
  std('i1', ig, iga, 'integration'), std('o1', o, oa, 'output')
]

export const departmentSeeds: DepartmentSeed[] = [
  // ───────────────────────── 1. SALES & CRM ─────────────────────────
  {
    slug: 'sales-crm',
    name: { en: 'Sales & CRM', ar: 'المبيعات وإدارة العملاء' },
    contextLine: { en: 'Four modules live · leads, orders, client history and follow-ups across every salesperson.', ar: 'أربع وحدات نشطة · العملاء المحتملون والطلبات وسجل العملاء والمتابعات لكل مندوب مبيعات.' },
    kpiSeeds: [
      { label: { en: 'Active clients', ar: 'العملاء النشطون' }, format: 'int', range: [120, 260] },
      { label: { en: 'Open orders', ar: 'طلبات مفتوحة' }, format: 'int', range: [18, 60], highlight: true },
      { label: { en: 'Pipeline value', ar: 'قيمة المبيعات المتوقعة' }, format: 'sar', range: [3, 11] },
      { label: { en: 'Overdue follow-ups', ar: 'متابعات متأخرة' }, format: 'int', range: [4, 22] }
    ],
    solutions: [
      {
        slug: 'lead-client-intake',
        name: { en: 'Lead & Client Intake', ar: 'استقبال العملاء المحتملين' },
        context: { en: 'Captures new leads from WhatsApp and email, verifies the client and opens a CRM record.', ar: 'يلتقط العملاء المحتملين من واتساب والبريد، يتحقق من العميل ويفتح سجلاً في النظام.' },
        systems: ['WhatsApp', 'Gmail', 'Supabase'],
        kpiSeeds: [
          { label: { en: 'LEADS CAPTURED · 24H', ar: 'عملاء محتملون · 24س' }, format: 'int', range: [12, 48] },
          { label: { en: 'AUTO-VERIFIED RATE', ar: 'نسبة التحقق التلقائي' }, format: 'pct', range: [72, 94], highlight: true },
          { label: { en: 'DUPLICATES BLOCKED', ar: 'تكرارات محجوبة' }, format: 'int', range: [2, 12] },
          { label: { en: 'AVG INTAKE TIME', ar: 'متوسط زمن الاستقبال' }, format: 'ms', range: [600, 1800] }
        ],
        chartTitle: { en: 'LEADS vs DUPLICATES · 14D', ar: 'العملاء المحتملون مقابل التكرارات · 14 يومًا' },
        chartA: { en: 'New leads', ar: 'عملاء جدد' }, chartB: { en: 'Duplicates', ar: 'تكرارات' },
        workflow: baseWorkflow('WhatsApp message', 'رسالة واتساب', 'Inbound email', 'بريد وارد', 'Intake agent', 'وكيل الاستقبال', 'CRM record', 'سجل العميل', 'New client', 'عميل جديد'),
        decisionTemplates: [
          { en: 'Verified client {n} · opened CRM record', ar: 'تم التحقق من العميل {n} · فُتح سجل في النظام' },
          { en: 'Merged duplicate lead for client {n}', ar: 'دمج عميل محتمل مكرر للعميل {n}' }
        ],
        interventionTemplates: [
          { en: 'Lead {n} missing phone · confirm before opening', ar: 'العميل {n} بلا رقم هاتف · أكّد قبل الفتح' },
          { en: 'Possible duplicate for client {n} · review match', ar: 'احتمال تكرار للعميل {n} · راجع المطابقة' }
        ],
        activityTemplates: [
          { en: 'Captured {n} leads · {q} auto-verified', ar: 'التقاط {n} عميلاً محتملاً · {q} تم التحقق منهم تلقائيًا' },
          { en: 'Opened {q} new CRM records', ar: 'فتح {q} سجلات عملاء جديدة' }
        ]
      },
      {
        slug: 'order-capture',
        name: { en: 'Order Capture & Parser', ar: 'التقاط الطلبات وتحليلها' },
        context: { en: 'Reads forwarded WhatsApp/email orders, extracts SKU, quantity and price into a draft order.', ar: 'يقرأ الطلبات المُحوّلة من واتساب والبريد، ويستخرج الصنف والكمية والسعر في طلب مبدئي.' },
        systems: ['WhatsApp', 'Claude', 'OCR', 'Supabase'],
        kpiSeeds: [
          { label: { en: 'ORDERS CAPTURED · 24H', ar: 'طلبات ملتقطة · 24س' }, format: 'int', range: [22, 70] },
          { label: { en: 'FIELD EXTRACTION RATE', ar: 'نسبة استخراج الحقول' }, format: 'pct', range: [83, 96], highlight: true },
          { label: { en: 'LOW-CONFIDENCE FLAGS', ar: 'إشارات ثقة منخفضة' }, format: 'int', range: [3, 16] },
          { label: { en: 'AVG PARSE TIME', ar: 'متوسط زمن التحليل' }, format: 'ms', range: [700, 2200] }
        ],
        chartTitle: { en: 'CAPTURED vs FLAGGED · 14D', ar: 'ملتقط مقابل مُعلَّم · 14 يومًا' },
        chartA: { en: 'Captured', ar: 'ملتقط' }, chartB: { en: 'Flagged', ar: 'مُعلَّم' },
        workflow: baseWorkflow('Forwarded order', 'طلب مُحوّل', 'Attached file', 'ملف مرفق', 'Parser agent', 'وكيل التحليل', 'Draft order', 'طلب مبدئي', 'Order queue', 'قائمة الطلبات'),
        decisionTemplates: [
          { en: 'Parsed order {n} · {q} line items extracted', ar: 'تحليل الطلب {n} · استخراج {q} بنود' },
          { en: 'Matched order {n} to client {m}', ar: 'ربط الطلب {n} بالعميل {m}' }
        ],
        interventionTemplates: [
          { en: 'Order {n} unit price unclear · confirm value', ar: 'سعر الوحدة في الطلب {n} غير واضح · أكّد القيمة' },
          { en: 'SKU on order {n} not recognised · map manually', ar: 'الصنف في الطلب {n} غير معروف · اربطه يدويًا' }
        ],
        activityTemplates: [
          { en: 'Parsed {n} orders · {q} ready for approval', ar: 'تحليل {n} طلبًا · {q} جاهز للاعتماد' },
          { en: 'Flagged {q} orders for human review', ar: 'تعليم {q} طلبات للمراجعة البشرية' }
        ]
      },
      {
        slug: 'client-history-risk',
        name: { en: 'Client History & Risk Profiler', ar: 'سجل العميل وتقييم المخاطر' },
        context: { en: 'Builds each client timeline and scores payment behaviour, overdue history and risk.', ar: 'يبني الخط الزمني لكل عميل ويقيّم سلوك السداد وتاريخ التأخير والمخاطر.' },
        systems: ['Supabase', 'Claude'],
        kpiSeeds: [
          { label: { en: 'CLIENTS PROFILED', ar: 'عملاء مُقيَّمون' }, format: 'int', range: [120, 260] },
          { label: { en: 'AVG RISK SCORE', ar: 'متوسط درجة المخاطر' }, format: 'pct', range: [18, 42], highlight: true },
          { label: { en: 'HIGH-RISK CLIENTS', ar: 'عملاء عالو المخاطر' }, format: 'int', range: [4, 18] },
          { label: { en: 'AVG ORDER VALUE', ar: 'متوسط قيمة الطلب' }, format: 'sar', range: [1, 4] }
        ],
        chartTitle: { en: 'PAYMENT BEHAVIOUR vs RISK · 14D', ar: 'سلوك السداد مقابل المخاطر · 14 يومًا' },
        chartA: { en: 'On-time pays', ar: 'سداد في الموعد' }, chartB: { en: 'Risk flags', ar: 'إشارات مخاطر' },
        workflow: baseWorkflow('Order history', 'سجل الطلبات', 'Payment records', 'سجلات السداد', 'Risk agent', 'وكيل المخاطر', 'Client profile', 'ملف العميل', 'Risk score', 'درجة المخاطر'),
        decisionTemplates: [
          { en: 'Updated risk score for client {n} → {q}%', ar: 'تحديث درجة المخاطر للعميل {n} ← {q}%' },
          { en: 'Flagged client {n} · {q} late payments', ar: 'تعليم العميل {n} · {q} حالات تأخير' }
        ],
        interventionTemplates: [
          { en: 'Client {n} risk rising · review credit limit', ar: 'مخاطر العميل {n} في ارتفاع · راجع حد الائتمان' },
          { en: 'Client {n} overdue balance · confirm hold', ar: 'رصيد متأخر للعميل {n} · أكّد الإيقاف' }
        ],
        activityTemplates: [
          { en: 'Recalculated risk for {n} clients', ar: 'إعادة احتساب المخاطر لـ {n} عميلاً' },
          { en: 'Updated {q} client timelines', ar: 'تحديث {q} خطوط زمنية للعملاء' }
        ]
      },
      {
        slug: 'follow-up-reminder',
        name: { en: 'Follow-up & Reminder Agent', ar: 'وكيل المتابعة والتذكير' },
        context: { en: 'Tracks payment deadlines and salesperson follow-ups, sends reminders before they slip.', ar: 'يتابع مواعيد السداد ومتابعات المندوبين، ويرسل تذكيرات قبل فوات الموعد.' },
        systems: ['WhatsApp', 'Gmail', 'Supabase'],
        kpiSeeds: [
          { label: { en: 'REMINDERS SENT · 24H', ar: 'تذكيرات مُرسلة · 24س' }, format: 'int', range: [30, 90] },
          { label: { en: 'FOLLOW-UPS ON TIME', ar: 'متابعات في الموعد' }, format: 'pct', range: [74, 93], highlight: true },
          { label: { en: 'OVERDUE TASKS', ar: 'مهام متأخرة' }, format: 'int', range: [4, 22] },
          { label: { en: 'AVG RESPONSE TIME', ar: 'متوسط زمن الرد' }, format: 'hrs', range: [2, 14] }
        ],
        chartTitle: { en: 'REMINDERS vs OVERDUE · 14D', ar: 'تذكيرات مقابل متأخرات · 14 يومًا' },
        chartA: { en: 'Reminders', ar: 'تذكيرات' }, chartB: { en: 'Overdue', ar: 'متأخرات' },
        workflow: baseWorkflow('Order deadlines', 'مواعيد الطلبات', 'Open tasks', 'مهام مفتوحة', 'Reminder agent', 'وكيل التذكير', 'WhatsApp / email', 'واتساب / بريد', 'Sent reminder', 'تذكير مُرسل'),
        decisionTemplates: [
          { en: 'Sent payment reminder for order {n}', ar: 'إرسال تذكير سداد للطلب {n}' },
          { en: 'Scheduled follow-up for client {n}', ar: 'جدولة متابعة للعميل {n}' }
        ],
        interventionTemplates: [
          { en: 'Order {n} overdue {q} days · escalate', ar: 'الطلب {n} متأخر {q} يومًا · صعّد' },
          { en: 'Client {n} unresponsive · assign salesperson', ar: 'العميل {n} لا يرد · أسند لمندوب' }
        ],
        activityTemplates: [
          { en: 'Sent {n} reminders · {q} acknowledged', ar: 'إرسال {n} تذكيرًا · {q} تم الإقرار بها' },
          { en: 'Closed {q} follow-up tasks', ar: 'إغلاق {q} مهام متابعة' }
        ]
      }
    ]
  },
  // ───────────────────────── 2. DOCUMENTS & INTAKE ─────────────────────────
  {
    slug: 'documents',
    name: { en: 'Documents & Intake', ar: 'الوثائق والاستقبال' },
    contextLine: { en: 'Four modules live · email, WhatsApp, OCR extraction and authentication of every document.', ar: 'أربع وحدات نشطة · البريد وواتساب واستخراج النصوص وتوثيق كل مستند.' },
    kpiSeeds: [
      { label: { en: 'Docs processed today', ar: 'مستندات معالَجة اليوم' }, format: 'int', range: [80, 220] },
      { label: { en: 'Auto-classified', ar: 'مصنّفة تلقائيًا' }, format: 'pct', range: [82, 96], highlight: true },
      { label: { en: 'Pending review', ar: 'بانتظار المراجعة' }, format: 'int', range: [6, 30] },
      { label: { en: 'Avg confidence', ar: 'متوسط الثقة' }, format: 'pct', range: [80, 95] }
    ],
    solutions: [
      {
        slug: 'email-intake',
        name: { en: 'Email Document Intake', ar: 'استقبال مستندات البريد' },
        context: { en: 'Fetches order-related emails, extracts attachments and routes them to the parser.', ar: 'يجلب رسائل البريد المتعلقة بالطلبات، يستخرج المرفقات ويوجّهها للمحلل.' },
        systems: ['Gmail', 'OCR', 'Claude', 'Supabase'],
        kpiSeeds: [
          { label: { en: 'EMAILS FETCHED · 24H', ar: 'رسائل مجلوبة · 24س' }, format: 'int', range: [40, 130] },
          { label: { en: 'ATTACHMENT EXTRACTION', ar: 'استخراج المرفقات' }, format: 'pct', range: [88, 98], highlight: true },
          { label: { en: 'UNMATCHED EMAILS', ar: 'رسائل غير مطابقة' }, format: 'int', range: [3, 18] },
          { label: { en: 'AVG FETCH TIME', ar: 'متوسط زمن الجلب' }, format: 'ms', range: [500, 1600] }
        ],
        chartTitle: { en: 'FETCHED vs UNMATCHED · 14D', ar: 'مجلوب مقابل غير مطابق · 14 يومًا' },
        chartA: { en: 'Fetched', ar: 'مجلوب' }, chartB: { en: 'Unmatched', ar: 'غير مطابق' },
        workflow: baseWorkflow('Inbox', 'صندوق الوارد', 'Attachments', 'المرفقات', 'Intake agent', 'وكيل الاستقبال', 'Doc parser', 'محلل المستندات', 'Document record', 'سجل المستند'),
        decisionTemplates: [
          { en: 'Fetched email {n} · {q} attachments extracted', ar: 'جلب الرسالة {n} · استخراج {q} مرفقات' },
          { en: 'Routed document {n} to parser', ar: 'توجيه المستند {n} إلى المحلل' }
        ],
        interventionTemplates: [
          { en: 'Email {n} could not be matched · assign client', ar: 'تعذّر مطابقة الرسالة {n} · أسند عميلاً' },
          { en: 'Attachment on email {n} corrupt · re-request', ar: 'مرفق الرسالة {n} تالف · اطلبه من جديد' }
        ],
        activityTemplates: [
          { en: 'Fetched {n} emails · {q} routed to parser', ar: 'جلب {n} رسالة · توجيه {q} إلى المحلل' },
          { en: 'Extracted {q} attachments', ar: 'استخراج {q} مرفقات' }
        ]
      },
      {
        slug: 'whatsapp-intake',
        name: { en: 'WhatsApp Document Intake', ar: 'استقبال مستندات واتساب' },
        context: { en: 'Receives WhatsApp media, identifies the sender and downloads documents into the order record.', ar: 'يستقبل وسائط واتساب، يحدّد المُرسِل ويُنزّل المستندات إلى سجل الطلب.' },
        systems: ['WhatsApp', 'OCR', 'Claude', 'Supabase'],
        kpiSeeds: [
          { label: { en: 'MESSAGES HANDLED · 24H', ar: 'رسائل معالَجة · 24س' }, format: 'int', range: [50, 160] },
          { label: { en: 'SENDER MATCH RATE', ar: 'نسبة مطابقة المُرسِل' }, format: 'pct', range: [80, 95], highlight: true },
          { label: { en: 'MEDIA QUEUED', ar: 'وسائط في الانتظار' }, format: 'int', range: [4, 20] },
          { label: { en: 'AVG HANDLE TIME', ar: 'متوسط زمن المعالجة' }, format: 'ms', range: [600, 1900] }
        ],
        chartTitle: { en: 'HANDLED vs UNMATCHED · 14D', ar: 'معالَج مقابل غير مطابق · 14 يومًا' },
        chartA: { en: 'Handled', ar: 'معالَج' }, chartB: { en: 'Unmatched', ar: 'غير مطابق' },
        workflow: baseWorkflow('WhatsApp media', 'وسائط واتساب', 'Sender number', 'رقم المُرسِل', 'Intake agent', 'وكيل الاستقبال', 'Doc parser', 'محلل المستندات', 'Document record', 'سجل المستند'),
        decisionTemplates: [
          { en: 'Matched message {n} to client {m}', ar: 'مطابقة الرسالة {n} بالعميل {m}' },
          { en: 'Downloaded {q} media from message {n}', ar: 'تنزيل {q} وسائط من الرسالة {n}' }
        ],
        interventionTemplates: [
          { en: 'Sender on message {n} unknown · identify', ar: 'مُرسِل الرسالة {n} غير معروف · حدّده' },
          { en: 'Message {n} missing context · ask for order no.', ar: 'الرسالة {n} بلا سياق · اطلب رقم الطلب' }
        ],
        activityTemplates: [
          { en: 'Handled {n} messages · {q} documents saved', ar: 'معالجة {n} رسالة · حفظ {q} مستندات' },
          { en: 'Matched {q} senders to clients', ar: 'مطابقة {q} مُرسِلين بالعملاء' }
        ]
      },
      {
        slug: 'classifier-ocr',
        name: { en: 'Classifier & OCR Extractor', ar: 'المصنّف ومستخرج النصوص' },
        context: { en: 'Detects document type, runs OCR and extracts key fields with a confidence score.', ar: 'يكتشف نوع المستند، يشغّل التعرّف الضوئي ويستخرج الحقول الرئيسية بدرجة ثقة.' },
        systems: ['OCR', 'Claude', 'Supabase'],
        kpiSeeds: [
          { label: { en: 'DOCS EXTRACTED · 24H', ar: 'مستندات مستخرَجة · 24س' }, format: 'int', range: [70, 200] },
          { label: { en: 'FIELD ACCURACY', ar: 'دقة الحقول' }, format: 'pct', range: [84, 97], highlight: true },
          { label: { en: 'LOW-CONFIDENCE DOCS', ar: 'مستندات منخفضة الثقة' }, format: 'int', range: [5, 24] },
          { label: { en: 'AVG OCR TIME', ar: 'متوسط زمن التعرّف' }, format: 'ms', range: [900, 2800] }
        ],
        chartTitle: { en: 'ACCURACY vs LOW-CONFIDENCE · 14D', ar: 'الدقة مقابل الثقة المنخفضة · 14 يومًا' },
        chartA: { en: 'Accurate', ar: 'دقيق' }, chartB: { en: 'Low-confidence', ar: 'ثقة منخفضة' },
        workflow: baseWorkflow('Scanned PDF', 'ملف ممسوح', 'Image / photo', 'صورة', 'OCR agent', 'وكيل التعرّف', 'Field extractor', 'مستخرج الحقول', 'Structured data', 'بيانات منظّمة'),
        decisionTemplates: [
          { en: 'Classified document {n} as quotation', ar: 'تصنيف المستند {n} كعرض سعر' },
          { en: 'Extracted {q} fields from document {n}', ar: 'استخراج {q} حقول من المستند {n}' }
        ],
        interventionTemplates: [
          { en: 'Document {n} confidence {q}% · verify fields', ar: 'ثقة المستند {n} {q}% · تحقق من الحقول' },
          { en: 'Document {n} type unclear · classify manually', ar: 'نوع المستند {n} غير واضح · صنّفه يدويًا' }
        ],
        activityTemplates: [
          { en: 'Extracted {n} documents · {q} need review', ar: 'استخراج {n} مستندًا · {q} يحتاج مراجعة' },
          { en: 'Classified {q} document types', ar: 'تصنيف {q} أنواع مستندات' }
        ]
      },
      {
        slug: 'authentication-matching',
        name: { en: 'Authentication & Matching', ar: 'التوثيق والمطابقة' },
        context: { en: 'Matches each document to client/order/SKU, checks stamp/signature and locks it after approval.', ar: 'يطابق كل مستند بالعميل/الطلب/الصنف، يتحقق من الختم/التوقيع ويقفله بعد الاعتماد.' },
        systems: ['Supabase', 'Claude'],
        kpiSeeds: [
          { label: { en: 'DOCS MATCHED · 24H', ar: 'مستندات مطابَقة · 24س' }, format: 'int', range: [60, 180] },
          { label: { en: 'AUTO-MATCH RATE', ar: 'نسبة المطابقة التلقائية' }, format: 'pct', range: [80, 95], highlight: true },
          { label: { en: 'UNVERIFIED STAMPS', ar: 'أختام غير موثّقة' }, format: 'int', range: [3, 16] },
          { label: { en: 'LOCKED DOCUMENTS', ar: 'مستندات مقفلة' }, format: 'int', range: [40, 140] }
        ],
        chartTitle: { en: 'MATCHED vs UNVERIFIED · 14D', ar: 'مطابَق مقابل غير موثّق · 14 يومًا' },
        chartA: { en: 'Matched', ar: 'مطابَق' }, chartB: { en: 'Unverified', ar: 'غير موثّق' },
        workflow: baseWorkflow('Extracted data', 'بيانات مستخرَجة', 'Order records', 'سجلات الطلبات', 'Match agent', 'وكيل المطابقة', 'Doc store', 'مخزن المستندات', 'Authenticated doc', 'مستند موثّق'),
        decisionTemplates: [
          { en: 'Matched document {n} to order {m}', ar: 'مطابقة المستند {n} بالطلب {m}' },
          { en: 'Verified stamp on document {n}', ar: 'توثيق الختم على المستند {n}' }
        ],
        interventionTemplates: [
          { en: 'Document {n} stamp missing · authenticate', ar: 'المستند {n} بلا ختم · وثّقه' },
          { en: 'Low match confidence on doc {n} · confirm order', ar: 'ثقة مطابقة منخفضة للمستند {n} · أكّد الطلب' }
        ],
        activityTemplates: [
          { en: 'Matched {n} documents · {q} locked', ar: 'مطابقة {n} مستندًا · قفل {q}' },
          { en: 'Verified {q} stamps and signatures', ar: 'توثيق {q} أختام وتواقيع' }
        ]
      }
    ]
  },
  // ───────────────────────── 3. APPROVALS ─────────────────────────
  {
    slug: 'approvals',
    name: { en: 'Approvals', ar: 'الاعتمادات' },
    contextLine: { en: 'Four modules live · AI order recommendations, margin, stock and payment-risk validation.', ar: 'أربع وحدات نشطة · توصيات الطلبات بالذكاء الاصطناعي والتحقق من الهامش والمخزون ومخاطر السداد.' },
    kpiSeeds: [
      { label: { en: 'Orders in queue', ar: 'طلبات في القائمة' }, format: 'int', range: [10, 44] },
      { label: { en: 'AI-recommended approve', ar: 'موصى بالموافقة' }, format: 'pct', range: [58, 82], highlight: true },
      { label: { en: 'Avg margin', ar: 'متوسط الهامش' }, format: 'pct', range: [14, 28] },
      { label: { en: 'Needs human review', ar: 'يحتاج مراجعة بشرية' }, format: 'int', range: [3, 16] }
    ],
    solutions: [
      {
        slug: 'order-approval-assistant',
        name: { en: 'Order Approval Assistant', ar: 'مساعد اعتماد الطلبات' },
        context: { en: 'Produces an explainable approve / reject / conditions recommendation for every order.', ar: 'ينتج توصية قابلة للتفسير بالموافقة أو الرفض أو الشروط لكل طلب.' },
        systems: ['Claude', 'Supabase', 'ERP'],
        kpiSeeds: [
          { label: { en: 'RECOMMENDATIONS · 24H', ar: 'توصيات · 24س' }, format: 'int', range: [20, 60] },
          { label: { en: 'AVG CONFIDENCE', ar: 'متوسط الثقة' }, format: 'pct', range: [78, 94], highlight: true },
          { label: { en: 'CONDITIONAL APPROVALS', ar: 'موافقات مشروطة' }, format: 'int', range: [4, 18] },
          { label: { en: 'AVG DECISION TIME', ar: 'متوسط زمن القرار' }, format: 'ms', range: [800, 2600] }
        ],
        chartTitle: { en: 'APPROVE vs REVIEW · 14D', ar: 'موافقة مقابل مراجعة · 14 يومًا' },
        chartA: { en: 'Recommended', ar: 'موصى به' }, chartB: { en: 'Needs review', ar: 'يحتاج مراجعة' },
        workflow: baseWorkflow('Order data', 'بيانات الطلب', 'Client history', 'سجل العميل', 'Approval agent', 'وكيل الاعتماد', 'Approval report', 'تقرير الاعتماد', 'Manager queue', 'قائمة المدير'),
        decisionTemplates: [
          { en: 'Recommended approve · order {n} margin {q}%', ar: 'توصية بالموافقة · الطلب {n} هامش {q}%' },
          { en: 'Recommended review · order {n} payment risk', ar: 'توصية بالمراجعة · مخاطر سداد الطلب {n}' }
        ],
        interventionTemplates: [
          { en: 'Order {n} below minimum margin · manager call', ar: 'الطلب {n} دون الحد الأدنى للهامش · قرار المدير' },
          { en: 'Order {n} high risk · needs human review', ar: 'الطلب {n} عالي المخاطر · يحتاج مراجعة بشرية' }
        ],
        activityTemplates: [
          { en: 'Produced {n} recommendations · {q} flagged', ar: 'إنتاج {n} توصية · تعليم {q}' },
          { en: 'Prepared {q} approval reports', ar: 'إعداد {q} تقارير اعتماد' }
        ]
      },
      {
        slug: 'margin-stock-validator',
        name: { en: 'Margin & Stock Validator', ar: 'مدقّق الهامش والمخزون' },
        context: { en: 'Calculates gross margin and checks the requested quantity against available stock.', ar: 'يحسب الهامش الإجمالي ويتحقق من الكمية المطلوبة مقابل المخزون المتاح.' },
        systems: ['ERP', 'Supabase'],
        kpiSeeds: [
          { label: { en: 'ORDERS VALIDATED · 24H', ar: 'طلبات مُدقَّقة · 24س' }, format: 'int', range: [22, 64] },
          { label: { en: 'MARGIN PASS RATE', ar: 'نسبة اجتياز الهامش' }, format: 'pct', range: [66, 88], highlight: true },
          { label: { en: 'STOCK SHORTFALLS', ar: 'نقص مخزون' }, format: 'int', range: [3, 15] },
          { label: { en: 'AVG MARGIN', ar: 'متوسط الهامش' }, format: 'pct', range: [13, 27] }
        ],
        chartTitle: { en: 'MARGIN PASS vs SHORTFALL · 14D', ar: 'اجتياز الهامش مقابل النقص · 14 يومًا' },
        chartA: { en: 'Passed', ar: 'مجتاز' }, chartB: { en: 'Shortfall', ar: 'نقص' },
        workflow: baseWorkflow('Order items', 'بنود الطلب', 'Cost & stock', 'التكلفة والمخزون', 'Validator agent', 'وكيل التدقيق', 'Margin check', 'فحص الهامش', 'Validation flag', 'إشارة التدقيق'),
        decisionTemplates: [
          { en: 'Validated order {n} · margin {q}% ✓', ar: 'تدقيق الطلب {n} · هامش {q}% ✓' },
          { en: 'Flagged stock shortfall on order {n}', ar: 'تعليم نقص مخزون في الطلب {n}' }
        ],
        interventionTemplates: [
          { en: 'Order {n} stock short by {q} units · partial?', ar: 'نقص مخزون الطلب {n} بمقدار {q} وحدة · جزئي؟' },
          { en: 'Order {n} margin {q}% under floor · approve?', ar: 'هامش الطلب {n} {q}% دون الحد · موافقة؟' }
        ],
        activityTemplates: [
          { en: 'Validated {n} orders · {q} shortfalls', ar: 'تدقيق {n} طلبًا · {q} حالات نقص' },
          { en: 'Recalculated margin on {q} orders', ar: 'إعادة احتساب الهامش لـ {q} طلبات' }
        ]
      },
      {
        slug: 'payment-risk-analyzer',
        name: { en: 'Payment Risk Analyzer', ar: 'محلّل مخاطر السداد' },
        context: { en: 'Weighs outstanding balance, payment behaviour and credit terms into a risk verdict.', ar: 'يوازن الرصيد المستحق وسلوك السداد وشروط الائتمان في حكم على المخاطر.' },
        systems: ['Supabase', 'Claude'],
        kpiSeeds: [
          { label: { en: 'ORDERS SCORED · 24H', ar: 'طلبات مُقيَّمة · 24س' }, format: 'int', range: [20, 60] },
          { label: { en: 'LOW-RISK RATE', ar: 'نسبة المخاطر المنخفضة' }, format: 'pct', range: [60, 84], highlight: true },
          { label: { en: 'HIGH-RISK ORDERS', ar: 'طلبات عالية المخاطر' }, format: 'int', range: [3, 14] },
          { label: { en: 'OUTSTANDING EXPOSURE', ar: 'الانكشاف المستحق' }, format: 'sar', range: [2, 9] }
        ],
        chartTitle: { en: 'LOW vs HIGH RISK · 14D', ar: 'مخاطر منخفضة مقابل عالية · 14 يومًا' },
        chartA: { en: 'Low risk', ar: 'مخاطر منخفضة' }, chartB: { en: 'High risk', ar: 'مخاطر عالية' },
        workflow: baseWorkflow('Outstanding balance', 'الرصيد المستحق', 'Payment history', 'سجل السداد', 'Risk agent', 'وكيل المخاطر', 'Risk verdict', 'حكم المخاطر', 'Approval input', 'مدخل الاعتماد'),
        decisionTemplates: [
          { en: 'Scored order {n} · risk {q}% (low)', ar: 'تقييم الطلب {n} · مخاطر {q}% (منخفضة)' },
          { en: 'Flagged order {n} · client balance high', ar: 'تعليم الطلب {n} · رصيد العميل مرتفع' }
        ],
        interventionTemplates: [
          { en: 'Order {n} exceeds credit limit · approve?', ar: 'الطلب {n} يتجاوز حد الائتمان · موافقة؟' },
          { en: 'Client on order {n} has {q} overdue invoices', ar: 'عميل الطلب {n} لديه {q} فواتير متأخرة' }
        ],
        activityTemplates: [
          { en: 'Scored {n} orders · {q} high-risk', ar: 'تقييم {n} طلبًا · {q} عالية المخاطر' },
          { en: 'Updated exposure for {q} clients', ar: 'تحديث الانكشاف لـ {q} عملاء' }
        ]
      },
      {
        slug: 'supplier-purchase-approval',
        name: { en: 'Supplier Purchase Approval', ar: 'اعتماد مشتريات الموردين' },
        context: { en: 'Routes internal supplier purchase plans to a superior for review and sign-off.', ar: 'يوجّه خطط الشراء الداخلية من الموردين إلى مسؤول أعلى للمراجعة والاعتماد.' },
        systems: ['Supabase', 'Claude', 'ERP'],
        kpiSeeds: [
          { label: { en: 'PLANS IN REVIEW', ar: 'خطط قيد المراجعة' }, format: 'int', range: [2, 12] },
          { label: { en: 'APPROVAL RATE', ar: 'نسبة الاعتماد' }, format: 'pct', range: [55, 80], highlight: true },
          { label: { en: 'BUDGET REQUESTED', ar: 'الميزانية المطلوبة' }, format: 'sar', range: [4, 16] },
          { label: { en: 'AVG REVIEW TIME', ar: 'متوسط زمن المراجعة' }, format: 'hrs', range: [4, 28] }
        ],
        chartTitle: { en: 'APPROVED vs HELD · 14D', ar: 'معتمَد مقابل موقوف · 14 يومًا' },
        chartA: { en: 'Approved', ar: 'معتمَد' }, chartB: { en: 'Held', ar: 'موقوف' },
        workflow: baseWorkflow('Purchase plan', 'خطة الشراء', 'Budget data', 'بيانات الميزانية', 'Approval agent', 'وكيل الاعتماد', 'Superior review', 'مراجعة المسؤول', 'Supplier PO', 'أمر شراء للمورد'),
        decisionTemplates: [
          { en: 'Routed plan {n} for superior approval', ar: 'توجيه الخطة {n} لاعتماد المسؤول' },
          { en: 'Generated supplier PO {n} after approval', ar: 'إنشاء أمر شراء {n} بعد الاعتماد' }
        ],
        interventionTemplates: [
          { en: 'Plan {n} over budget by {q}% · approve?', ar: 'الخطة {n} تتجاوز الميزانية بـ {q}% · موافقة؟' },
          { en: 'Plan {n} awaiting superior sign-off', ar: 'الخطة {n} بانتظار اعتماد المسؤول' }
        ],
        activityTemplates: [
          { en: 'Routed {n} plans · {q} approved', ar: 'توجيه {n} خطة · اعتماد {q}' },
          { en: 'Generated {q} supplier POs', ar: 'إنشاء {q} أوامر شراء للموردين' }
        ]
      }
    ]
  },
  // ───────────────────────── 4. WAREHOUSE & INVENTORY ─────────────────────────
  {
    slug: 'warehouse',
    name: { en: 'Warehouse & Inventory', ar: 'المستودع والمخزون' },
    contextLine: { en: 'Four modules live · stock, batches, dispatch and loading across cold and dry storage.', ar: 'أربع وحدات نشطة · المخزون والدفعات والإرسال والتحميل عبر التخزين المبرّد والجاف.' },
    kpiSeeds: [
      { label: { en: 'SKUs in stock', ar: 'أصناف في المخزون' }, format: 'int', range: [60, 180] },
      { label: { en: 'Reserved quantity', ar: 'كمية محجوزة' }, format: 'int', range: [200, 900], highlight: true },
      { label: { en: 'Batches expiring 30d', ar: 'دفعات تنتهي خلال 30 يومًا' }, format: 'int', range: [3, 18] },
      { label: { en: 'Dispatches today', ar: 'إرساليات اليوم' }, format: 'int', range: [8, 36] }
    ],
    solutions: [
      {
        slug: 'stock-batch-tracker',
        name: { en: 'Stock & Batch Tracker', ar: 'متتبّع المخزون والدفعات' },
        context: { en: 'Tracks SKU, batch, expiry, available/reserved/blocked quantity per warehouse.', ar: 'يتتبّع الصنف والدفعة والصلاحية والكميات المتاحة/المحجوزة/الموقوفة لكل مستودع.' },
        systems: ['ERP', 'Supabase'],
        kpiSeeds: [
          { label: { en: 'STOCK UPDATES · 24H', ar: 'تحديثات مخزون · 24س' }, format: 'int', range: [60, 200] },
          { label: { en: 'STOCK ACCURACY', ar: 'دقة المخزون' }, format: 'pct', range: [90, 99], highlight: true },
          { label: { en: 'BLOCKED QUANTITY', ar: 'كمية موقوفة' }, format: 'int', range: [10, 80] },
          { label: { en: 'LOW-STOCK SKUS', ar: 'أصناف منخفضة المخزون' }, format: 'int', range: [3, 16] }
        ],
        chartTitle: { en: 'AVAILABLE vs RESERVED · 14D', ar: 'متاح مقابل محجوز · 14 يومًا' },
        chartA: { en: 'Available', ar: 'متاح' }, chartB: { en: 'Reserved', ar: 'محجوز' },
        workflow: baseWorkflow('ERP stock feed', 'تغذية مخزون ERP', 'Batch records', 'سجلات الدفعات', 'Tracker agent', 'وكيل التتبّع', 'Inventory table', 'جدول المخزون', 'Stock status', 'حالة المخزون'),
        decisionTemplates: [
          { en: 'Updated stock for SKU {n} · {q} units', ar: 'تحديث مخزون الصنف {n} · {q} وحدة' },
          { en: 'Reserved {q} units for order {n}', ar: 'حجز {q} وحدة للطلب {n}' }
        ],
        interventionTemplates: [
          { en: 'SKU {n} low stock · {q} units left', ar: 'الصنف {n} منخفض المخزون · بقي {q} وحدة' },
          { en: 'Stock count mismatch on SKU {n} · recount', ar: 'عدم تطابق جرد الصنف {n} · أعد العدّ' }
        ],
        activityTemplates: [
          { en: 'Updated {n} stock records · {q} reserved', ar: 'تحديث {n} سجل مخزون · حجز {q}' },
          { en: 'Synced {q} batches from ERP', ar: 'مزامنة {q} دفعات من ERP' }
        ]
      },
      {
        slug: 'dispatch-coordinator',
        name: { en: 'Dispatch Coordinator', ar: 'منسّق الإرسال' },
        context: { en: 'On approval, notifies the warehouse, reserves stock, assigns a batch and a loading deadline.', ar: 'عند الاعتماد، يخطر المستودع، يحجز المخزون، يخصّص دفعة وموعد تحميل.' },
        systems: ['Supabase', 'WhatsApp', 'ERP'],
        kpiSeeds: [
          { label: { en: 'DISPATCHES CREATED · 24H', ar: 'إرساليات مُنشأة · 24س' }, format: 'int', range: [10, 38] },
          { label: { en: 'ON-TIME DISPATCH', ar: 'إرسال في الموعد' }, format: 'pct', range: [78, 95], highlight: true },
          { label: { en: 'AWAITING CONFIRMATION', ar: 'بانتظار التأكيد' }, format: 'int', range: [3, 14] },
          { label: { en: 'AVG PREP TIME', ar: 'متوسط زمن التجهيز' }, format: 'hrs', range: [2, 10] }
        ],
        chartTitle: { en: 'DISPATCHED vs DELAYED · 14D', ar: 'مُرسَل مقابل متأخر · 14 يومًا' },
        chartA: { en: 'Dispatched', ar: 'مُرسَل' }, chartB: { en: 'Delayed', ar: 'متأخر' },
        workflow: baseWorkflow('Approved order', 'طلب معتمَد', 'Stock reserve', 'حجز المخزون', 'Dispatch agent', 'وكيل الإرسال', 'Warehouse alert', 'تنبيه المستودع', 'Dispatch record', 'سجل الإرسال'),
        decisionTemplates: [
          { en: 'Created dispatch for order {n} · batch {m}', ar: 'إنشاء إرسالية للطلب {n} · دفعة {m}' },
          { en: 'Set loading deadline for order {n}', ar: 'تحديد موعد تحميل للطلب {n}' }
        ],
        interventionTemplates: [
          { en: 'Order {n} loading deadline near · confirm prep', ar: 'موعد تحميل الطلب {n} قريب · أكّد التجهيز' },
          { en: 'Warehouse not confirmed for order {n}', ar: 'المستودع لم يؤكّد الطلب {n}' }
        ],
        activityTemplates: [
          { en: 'Created {n} dispatches · {q} confirmed', ar: 'إنشاء {n} إرسالية · تأكيد {q}' },
          { en: 'Reserved stock for {q} orders', ar: 'حجز مخزون لـ {q} طلبات' }
        ]
      },
      {
        slug: 'batch-expiry-monitor',
        name: { en: 'Batch Expiry Monitor', ar: 'مراقب صلاحية الدفعات' },
        context: { en: 'Watches expiry dates across cold storage and alerts before batches go to waste.', ar: 'يراقب تواريخ الصلاحية في التخزين المبرّد وينبّه قبل تلف الدفعات.' },
        systems: ['Supabase', 'WhatsApp'],
        kpiSeeds: [
          { label: { en: 'BATCHES MONITORED', ar: 'دفعات مُراقَبة' }, format: 'int', range: [40, 140] },
          { label: { en: 'EXPIRY ALERT LEAD', ar: 'مهلة تنبيه الصلاحية' }, format: 'hrs', range: [24, 96], highlight: true },
          { label: { en: 'EXPIRING 7D', ar: 'تنتهي خلال 7 أيام' }, format: 'int', range: [2, 12] },
          { label: { en: 'WASTE PREVENTED', ar: 'هدر تم تفاديه' }, format: 'sar', range: [0, 2] }
        ],
        chartTitle: { en: 'SAFE vs EXPIRING · 14D', ar: 'آمن مقابل قارب الانتهاء · 14 يومًا' },
        chartA: { en: 'Safe', ar: 'آمن' }, chartB: { en: 'Expiring', ar: 'قارب الانتهاء' },
        workflow: baseWorkflow('Batch records', 'سجلات الدفعات', 'Expiry dates', 'تواريخ الصلاحية', 'Monitor agent', 'وكيل المراقبة', 'Alert engine', 'محرّك التنبيه', 'Expiry alert', 'تنبيه صلاحية'),
        decisionTemplates: [
          { en: 'Flagged batch {n} · expires in {q} days', ar: 'تعليم الدفعة {n} · تنتهي خلال {q} أيام' },
          { en: 'Prioritised batch {n} for next dispatch', ar: 'إعطاء أولوية للدفعة {n} في الإرسال القادم' }
        ],
        interventionTemplates: [
          { en: 'Batch {n} expires in {q} days · push to sell', ar: 'الدفعة {n} تنتهي خلال {q} أيام · ادفع للبيع' },
          { en: 'Batch {n} past expiry · block from stock', ar: 'الدفعة {n} منتهية · امنعها من المخزون' }
        ],
        activityTemplates: [
          { en: 'Monitored {n} batches · {q} flagged', ar: 'مراقبة {n} دفعة · تعليم {q}' },
          { en: 'Sent {q} expiry alerts', ar: 'إرسال {q} تنبيهات صلاحية' }
        ]
      },
      {
        slug: 'loading-scheduler',
        name: { en: 'Loading Scheduler', ar: 'مجدوِل التحميل' },
        context: { en: 'Schedules picking and loading windows and assigns vehicles to ready dispatches.', ar: 'يجدول نوافذ التجهيز والتحميل ويخصّص المركبات للإرساليات الجاهزة.' },
        systems: ['Supabase', 'ERP'],
        kpiSeeds: [
          { label: { en: 'LOADS SCHEDULED · 24H', ar: 'تحميلات مجدولة · 24س' }, format: 'int', range: [8, 32] },
          { label: { en: 'SCHEDULE ADHERENCE', ar: 'الالتزام بالجدول' }, format: 'pct', range: [76, 94], highlight: true },
          { label: { en: 'UNASSIGNED VEHICLES', ar: 'مركبات غير مخصّصة' }, format: 'int', range: [1, 8] },
          { label: { en: 'AVG LOAD TIME', ar: 'متوسط زمن التحميل' }, format: 'hrs', range: [1, 5] }
        ],
        chartTitle: { en: 'ON-SCHEDULE vs SLIPPED · 14D', ar: 'في الموعد مقابل متأخر · 14 يومًا' },
        chartA: { en: 'On schedule', ar: 'في الموعد' }, chartB: { en: 'Slipped', ar: 'متأخر' },
        workflow: baseWorkflow('Ready dispatches', 'إرساليات جاهزة', 'Vehicle pool', 'أسطول المركبات', 'Scheduler agent', 'وكيل الجدولة', 'Loading plan', 'خطة التحميل', 'Loading slot', 'موعد التحميل'),
        decisionTemplates: [
          { en: 'Scheduled loading for order {n} · slot {q}', ar: 'جدولة تحميل الطلب {n} · الموعد {q}' },
          { en: 'Assigned vehicle to dispatch {n}', ar: 'تخصيص مركبة للإرسالية {n}' }
        ],
        interventionTemplates: [
          { en: 'No vehicle for dispatch {n} · assign manually', ar: 'لا مركبة للإرسالية {n} · خصّص يدويًا' },
          { en: 'Loading slot {q} overbooked · rebalance', ar: 'الموعد {q} محجوز بزيادة · أعد التوزيع' }
        ],
        activityTemplates: [
          { en: 'Scheduled {n} loads · {q} vehicles assigned', ar: 'جدولة {n} تحميلة · تخصيص {q} مركبة' },
          { en: 'Rebalanced {q} loading slots', ar: 'إعادة توزيع {q} مواعيد تحميل' }
        ]
      }
    ]
  },
  // ───────────────────────── 5. LOGISTICS & DELIVERY ─────────────────────────
  {
    slug: 'logistics',
    name: { en: 'Logistics & Delivery', ar: 'اللوجستيات والتوصيل' },
    contextLine: { en: 'Four modules live · driver routing, live status, delivery notes and client notifications.', ar: 'أربع وحدات نشطة · توجيه السائقين والحالة المباشرة وإشعارات التسليم وتنبيهات العملاء.' },
    kpiSeeds: [
      { label: { en: 'Active deliveries', ar: 'توصيلات نشطة' }, format: 'int', range: [12, 48] },
      { label: { en: 'On-time rate', ar: 'نسبة التسليم في الموعد' }, format: 'pct', range: [80, 96], highlight: true },
      { label: { en: 'Delivery notes pending', ar: 'إشعارات تسليم معلّقة' }, format: 'int', range: [4, 20] },
      { label: { en: 'Notifications sent today', ar: 'إشعارات مُرسلة اليوم' }, format: 'int', range: [40, 160] }
    ],
    solutions: [
      {
        slug: 'driver-route-assignment',
        name: { en: 'Driver Route Assignment', ar: 'إسناد مسارات السائقين' },
        context: { en: 'Assigns drivers and routes to loaded dispatches and sends delivery details.', ar: 'يسند السائقين والمسارات للإرساليات المُحمّلة ويرسل تفاصيل التسليم.' },
        systems: ['WhatsApp', 'Supabase'],
        kpiSeeds: [
          { label: { en: 'ROUTES ASSIGNED · 24H', ar: 'مسارات مُسندة · 24س' }, format: 'int', range: [10, 40] },
          { label: { en: 'DRIVER ACCEPT RATE', ar: 'نسبة قبول السائقين' }, format: 'pct', range: [82, 97], highlight: true },
          { label: { en: 'UNASSIGNED ORDERS', ar: 'طلبات غير مُسندة' }, format: 'int', range: [2, 12] },
          { label: { en: 'AVG ASSIGN TIME', ar: 'متوسط زمن الإسناد' }, format: 'ms', range: [500, 1800] }
        ],
        chartTitle: { en: 'ASSIGNED vs PENDING · 14D', ar: 'مُسند مقابل معلّق · 14 يومًا' },
        chartA: { en: 'Assigned', ar: 'مُسند' }, chartB: { en: 'Pending', ar: 'معلّق' },
        workflow: baseWorkflow('Loaded dispatch', 'إرسالية مُحمّلة', 'Driver pool', 'أسطول السائقين', 'Routing agent', 'وكيل التوجيه', 'Driver app', 'تطبيق السائق', 'Assigned route', 'مسار مُسند'),
        decisionTemplates: [
          { en: 'Assigned driver to order {n} · route {q}', ar: 'إسناد سائق للطلب {n} · المسار {q}' },
          { en: 'Sent delivery details for order {n}', ar: 'إرسال تفاصيل تسليم الطلب {n}' }
        ],
        interventionTemplates: [
          { en: 'No driver for order {n} · assign manually', ar: 'لا سائق للطلب {n} · أسند يدويًا' },
          { en: 'Driver declined order {n} · reassign', ar: 'رفض السائق الطلب {n} · أعد الإسناد' }
        ],
        activityTemplates: [
          { en: 'Assigned {n} routes · {q} accepted', ar: 'إسناد {n} مسارًا · قبول {q}' },
          { en: 'Dispatched {q} drivers', ar: 'إرسال {q} سائقين' }
        ]
      },
      {
        slug: 'delivery-status-tracker',
        name: { en: 'Delivery Status Tracker', ar: 'متتبّع حالة التسليم' },
        context: { en: 'Follows each order from picked-up → on the way → delivered with driver updates.', ar: 'يتابع كل طلب من الاستلام ← في الطريق ← تم التسليم بتحديثات السائق.' },
        systems: ['WhatsApp', 'Supabase'],
        kpiSeeds: [
          { label: { en: 'STATUS UPDATES · 24H', ar: 'تحديثات حالة · 24س' }, format: 'int', range: [40, 150] },
          { label: { en: 'ON-TIME RATE', ar: 'نسبة الموعد' }, format: 'pct', range: [80, 96], highlight: true },
          { label: { en: 'DELAYED ORDERS', ar: 'طلبات متأخرة' }, format: 'int', range: [2, 12] },
          { label: { en: 'AVG TRANSIT TIME', ar: 'متوسط زمن النقل' }, format: 'hrs', range: [1, 6] }
        ],
        chartTitle: { en: 'ON-TIME vs DELAYED · 14D', ar: 'في الموعد مقابل متأخر · 14 يومًا' },
        chartA: { en: 'On time', ar: 'في الموعد' }, chartB: { en: 'Delayed', ar: 'متأخر' },
        workflow: baseWorkflow('Driver updates', 'تحديثات السائق', 'Route data', 'بيانات المسار', 'Tracker agent', 'وكيل التتبّع', 'Order status', 'حالة الطلب', 'Live timeline', 'خط زمني مباشر'),
        decisionTemplates: [
          { en: 'Order {n} marked on the way', ar: 'الطلب {n} في الطريق' },
          { en: 'Order {n} delivered · {q} min early', ar: 'تسليم الطلب {n} · مبكرًا {q} دقيقة' }
        ],
        interventionTemplates: [
          { en: 'Order {n} delayed {q}h · notify client', ar: 'الطلب {n} متأخر {q} ساعة · أخطر العميل' },
          { en: 'No update on order {n} · contact driver', ar: 'لا تحديث للطلب {n} · تواصل مع السائق' }
        ],
        activityTemplates: [
          { en: 'Processed {n} status updates · {q} delivered', ar: 'معالجة {n} تحديث حالة · تسليم {q}' },
          { en: 'Flagged {q} delayed orders', ar: 'تعليم {q} طلبات متأخرة' }
        ]
      },
      {
        slug: 'delivery-note-processor',
        name: { en: 'Delivery Note Processor', ar: 'معالج إشعارات التسليم' },
        context: { en: 'Extracts the delivery note, matches it to the order, checks stamp and triggers payment terms.', ar: 'يستخرج إشعار التسليم، يطابقه بالطلب، يتحقق من الختم ويُفعّل شروط السداد.' },
        systems: ['OCR', 'Claude', 'Supabase'],
        kpiSeeds: [
          { label: { en: 'NOTES PROCESSED · 24H', ar: 'إشعارات معالَجة · 24س' }, format: 'int', range: [12, 44] },
          { label: { en: 'AUTO-MATCH RATE', ar: 'نسبة المطابقة التلقائية' }, format: 'pct', range: [82, 96], highlight: true },
          { label: { en: 'UNSIGNED NOTES', ar: 'إشعارات غير موقّعة' }, format: 'int', range: [2, 12] },
          { label: { en: 'AVG PROCESS TIME', ar: 'متوسط زمن المعالجة' }, format: 'ms', range: [800, 2400] }
        ],
        chartTitle: { en: 'MATCHED vs UNSIGNED · 14D', ar: 'مطابَق مقابل غير موقّع · 14 يومًا' },
        chartA: { en: 'Matched', ar: 'مطابَق' }, chartB: { en: 'Unsigned', ar: 'غير موقّع' },
        workflow: baseWorkflow('Delivery note', 'إشعار التسليم', 'Order record', 'سجل الطلب', 'Note agent', 'وكيل الإشعار', 'Payment trigger', 'مُطلِق السداد', 'Closed delivery', 'تسليم مغلق'),
        decisionTemplates: [
          { en: 'Matched delivery note to order {n}', ar: 'مطابقة إشعار التسليم بالطلب {n}' },
          { en: 'Generated payment deadline for order {n}', ar: 'إنشاء موعد سداد للطلب {n}' }
        ],
        interventionTemplates: [
          { en: 'Delivery note {n} unsigned · confirm receipt', ar: 'إشعار التسليم {n} غير موقّع · أكّد الاستلام' },
          { en: 'Note {n} quantity differs · review', ar: 'كمية الإشعار {n} مختلفة · راجع' }
        ],
        activityTemplates: [
          { en: 'Processed {n} delivery notes · {q} closed', ar: 'معالجة {n} إشعار تسليم · إغلاق {q}' },
          { en: 'Triggered payment terms on {q} orders', ar: 'تفعيل شروط السداد لـ {q} طلبات' }
        ]
      },
      {
        slug: 'client-notification-engine',
        name: { en: 'Client Notification Engine', ar: 'محرّك إشعارات العملاء' },
        context: { en: 'Sends bilingual order-status updates to clients via WhatsApp and email at each milestone.', ar: 'يرسل تحديثات حالة الطلب ثنائية اللغة للعملاء عبر واتساب والبريد عند كل مرحلة.' },
        systems: ['WhatsApp', 'Gmail', 'Supabase'],
        kpiSeeds: [
          { label: { en: 'NOTIFICATIONS SENT · 24H', ar: 'إشعارات مُرسلة · 24س' }, format: 'int', range: [40, 160] },
          { label: { en: 'DELIVERY RATE', ar: 'نسبة الوصول' }, format: 'pct', range: [88, 99], highlight: true },
          { label: { en: 'FAILED SENDS', ar: 'إرسالات فاشلة' }, format: 'int', range: [1, 10] },
          { label: { en: 'AVG SEND TIME', ar: 'متوسط زمن الإرسال' }, format: 'ms', range: [300, 1200] }
        ],
        chartTitle: { en: 'DELIVERED vs FAILED · 14D', ar: 'واصِل مقابل فاشل · 14 يومًا' },
        chartA: { en: 'Delivered', ar: 'واصِل' }, chartB: { en: 'Failed', ar: 'فاشل' },
        workflow: baseWorkflow('Order milestone', 'مرحلة الطلب', 'Client contact', 'بيانات العميل', 'Notify agent', 'وكيل الإشعار', 'WhatsApp / email', 'واتساب / بريد', 'Client update', 'تحديث للعميل'),
        decisionTemplates: [
          { en: 'Notified client of order {n} · on the way', ar: 'إخطار العميل بالطلب {n} · في الطريق' },
          { en: 'Sent delivery note to client for order {n}', ar: 'إرسال إشعار التسليم للعميل للطلب {n}' }
        ],
        interventionTemplates: [
          { en: 'Notification for order {n} failed · retry', ar: 'فشل إشعار الطلب {n} · أعد المحاولة' },
          { en: 'Client of order {n} opted out · use email', ar: 'عميل الطلب {n} ألغى الاشتراك · استخدم البريد' }
        ],
        activityTemplates: [
          { en: 'Sent {n} notifications · {q} delivered', ar: 'إرسال {n} إشعارًا · وصول {q}' },
          { en: 'Retried {q} failed sends', ar: 'إعادة محاولة {q} إرسالات فاشلة' }
        ]
      }
    ]
  },
  // ───────────────────────── 6. FINANCE & ACCOUNTING ─────────────────────────
  {
    slug: 'finance',
    name: { en: 'Finance & Accounting', ar: 'المالية والمحاسبة' },
    contextLine: { en: 'Four modules live · payment deadlines, promissory notes, receipts and clean Excel exports.', ar: 'أربع وحدات نشطة · مواعيد السداد والسندات لأمر والإيصالات وتصدير Excel نظيف.' },
    kpiSeeds: [
      { label: { en: 'Receivables open', ar: 'مستحقات مفتوحة' }, format: 'sar', range: [6, 22], highlight: true },
      { label: { en: 'Overdue payments', ar: 'مدفوعات متأخرة' }, format: 'int', range: [6, 28] },
      { label: { en: 'Promissory notes held', ar: 'سندات لأمر محفوظة' }, format: 'int', range: [10, 50] },
      { label: { en: 'Collected this month', ar: 'محصّل هذا الشهر' }, format: 'sar', range: [8, 30] }
    ],
    solutions: [
      {
        slug: 'payment-deadline-tracker',
        name: { en: 'Payment Deadline Tracker', ar: 'متتبّع مواعيد السداد' },
        context: { en: 'Creates due dates from delivery, reminds before due and escalates overdue payments.', ar: 'ينشئ مواعيد الاستحقاق من التسليم، يذكّر قبلها ويصعّد المدفوعات المتأخرة.' },
        systems: ['Supabase', 'WhatsApp', 'Gmail'],
        kpiSeeds: [
          { label: { en: 'DEADLINES TRACKED', ar: 'مواعيد مُتتبَّعة' }, format: 'int', range: [40, 140] },
          { label: { en: 'ON-TIME COLLECTION', ar: 'تحصيل في الموعد' }, format: 'pct', range: [62, 86], highlight: true },
          { label: { en: 'OVERDUE PAYMENTS', ar: 'مدفوعات متأخرة' }, format: 'int', range: [6, 26] },
          { label: { en: 'AVG DAYS TO PAY', ar: 'متوسط أيام السداد' }, format: 'hrs', range: [4, 12] }
        ],
        chartTitle: { en: 'ON-TIME vs OVERDUE · 14D', ar: 'في الموعد مقابل متأخر · 14 يومًا' },
        chartA: { en: 'On time', ar: 'في الموعد' }, chartB: { en: 'Overdue', ar: 'متأخر' },
        workflow: baseWorkflow('Delivered orders', 'طلبات مُسلّمة', 'Payment terms', 'شروط السداد', 'Deadline agent', 'وكيل المواعيد', 'Reminder engine', 'محرّك التذكير', 'Payment status', 'حالة السداد'),
        decisionTemplates: [
          { en: 'Set due date for order {n} · 7 days', ar: 'تحديد موعد استحقاق الطلب {n} · 7 أيام' },
          { en: 'Sent pre-due reminder for order {n}', ar: 'إرسال تذكير قبل الاستحقاق للطلب {n}' }
        ],
        interventionTemplates: [
          { en: 'Order {n} overdue {q} days · escalate', ar: 'الطلب {n} متأخر {q} يومًا · صعّد' },
          { en: 'Client of order {n} disputes amount · review', ar: 'عميل الطلب {n} يعترض على المبلغ · راجع' }
        ],
        activityTemplates: [
          { en: 'Tracked {n} deadlines · {q} collected', ar: 'تتبّع {n} موعدًا · تحصيل {q}' },
          { en: 'Escalated {q} overdue payments', ar: 'تصعيد {q} مدفوعات متأخرة' }
        ]
      },
      {
        slug: 'promissory-note-tracker',
        name: { en: 'Promissory Note Tracker', ar: 'متتبّع السندات لأمر' },
        context: { en: 'Tracks سند لأمر status, due dates and secure access to signed financial instruments.', ar: 'يتتبّع حالة السندات لأمر ومواعيد استحقاقها والوصول الآمن للأدوات المالية الموقّعة.' },
        systems: ['Supabase'],
        kpiSeeds: [
          { label: { en: 'NOTES HELD', ar: 'سندات محفوظة' }, format: 'int', range: [10, 50] },
          { label: { en: 'COVERAGE RATE', ar: 'نسبة التغطية' }, format: 'pct', range: [70, 92], highlight: true },
          { label: { en: 'DUE THIS MONTH', ar: 'مستحقة هذا الشهر' }, format: 'int', range: [2, 14] },
          { label: { en: 'SECURED VALUE', ar: 'القيمة المضمونة' }, format: 'sar', range: [5, 18] }
        ],
        chartTitle: { en: 'HELD vs DUE · 14D', ar: 'محفوظ مقابل مستحق · 14 يومًا' },
        chartA: { en: 'Held', ar: 'محفوظ' }, chartB: { en: 'Due', ar: 'مستحق' },
        workflow: baseWorkflow('Signed notes', 'سندات موقّعة', 'Order records', 'سجلات الطلبات', 'Note agent', 'وكيل السندات', 'Secure vault', 'خزنة آمنة', 'Note status', 'حالة السند'),
        decisionTemplates: [
          { en: 'Logged promissory note for order {n}', ar: 'تسجيل سند لأمر للطلب {n}' },
          { en: 'Flagged note {n} due in {q} days', ar: 'تعليم السند {n} مستحق خلال {q} أيام' }
        ],
        interventionTemplates: [
          { en: 'Note {n} due in {q} days · prepare collection', ar: 'السند {n} مستحق خلال {q} أيام · جهّز التحصيل' },
          { en: 'Order {n} has no promissory note · request', ar: 'الطلب {n} بلا سند لأمر · اطلبه' }
        ],
        activityTemplates: [
          { en: 'Logged {n} notes · {q} due this month', ar: 'تسجيل {n} سند · {q} مستحق هذا الشهر' },
          { en: 'Secured {q} signed instruments', ar: 'تأمين {q} أدوات موقّعة' }
        ]
      },
      {
        slug: 'receipt-invoice-manager',
        name: { en: 'Receipt & Invoice Manager', ar: 'مدير الإيصالات والفواتير' },
        context: { en: 'Organises receipts, invoices and VAT, tying each to its order and payment.', ar: 'ينظّم الإيصالات والفواتير وضريبة القيمة المضافة، ويربط كلًّا بطلبه وسداده.' },
        systems: ['Supabase', 'OCR', 'Claude'],
        kpiSeeds: [
          { label: { en: 'DOCS RECONCILED · 24H', ar: 'مستندات مُسوّاة · 24س' }, format: 'int', range: [30, 110] },
          { label: { en: 'RECONCILIATION RATE', ar: 'نسبة التسوية' }, format: 'pct', range: [82, 96], highlight: true },
          { label: { en: 'MISSING INVOICES', ar: 'فواتير مفقودة' }, format: 'int', range: [3, 16] },
          { label: { en: 'VAT TRACKED', ar: 'ضريبة مُتتبَّعة' }, format: 'sar', range: [1, 5] }
        ],
        chartTitle: { en: 'RECONCILED vs MISSING · 14D', ar: 'مُسوّى مقابل مفقود · 14 يومًا' },
        chartA: { en: 'Reconciled', ar: 'مُسوّى' }, chartB: { en: 'Missing', ar: 'مفقود' },
        workflow: baseWorkflow('Receipts', 'إيصالات', 'Invoices', 'فواتير', 'Reconcile agent', 'وكيل التسوية', 'Ledger entry', 'قيد السجل', 'Finance record', 'سجل مالي'),
        decisionTemplates: [
          { en: 'Reconciled invoice {n} to payment {m}', ar: 'تسوية الفاتورة {n} بالسداد {m}' },
          { en: 'Logged VAT for order {n}', ar: 'تسجيل ضريبة القيمة المضافة للطلب {n}' }
        ],
        interventionTemplates: [
          { en: 'Order {n} missing invoice · request from sales', ar: 'الطلب {n} بلا فاتورة · اطلبها من المبيعات' },
          { en: 'Invoice {n} VAT mismatch · verify', ar: 'عدم تطابق ضريبة الفاتورة {n} · تحقق' }
        ],
        activityTemplates: [
          { en: 'Reconciled {n} documents · {q} pending', ar: 'تسوية {n} مستندًا · {q} معلّق' },
          { en: 'Logged VAT on {q} orders', ar: 'تسجيل الضريبة لـ {q} طلبات' }
        ]
      },
      {
        slug: 'accounting-excel-export',
        name: { en: 'Accounting Excel Export', ar: 'تصدير Excel المحاسبي' },
        context: { en: 'Generates clean, accountant-ready XLSX exports with document links and payment status.', ar: 'ينشئ ملفات Excel نظيفة جاهزة للمحاسب مع روابط المستندات وحالة السداد.' },
        systems: ['Supabase'],
        kpiSeeds: [
          { label: { en: 'EXPORTS GENERATED', ar: 'تصديرات مُنشأة' }, format: 'int', range: [4, 22] },
          { label: { en: 'RECORD COMPLETENESS', ar: 'اكتمال السجلات' }, format: 'pct', range: [88, 99], highlight: true },
          { label: { en: 'INCOMPLETE ROWS', ar: 'صفوف ناقصة' }, format: 'int', range: [2, 14] },
          { label: { en: 'ROWS EXPORTED', ar: 'صفوف مُصدّرة' }, format: 'int', range: [400, 2200] }
        ],
        chartTitle: { en: 'COMPLETE vs INCOMPLETE · 14D', ar: 'مكتمل مقابل ناقص · 14 يومًا' },
        chartA: { en: 'Complete', ar: 'مكتمل' }, chartB: { en: 'Incomplete', ar: 'ناقص' },
        workflow: baseWorkflow('Order records', 'سجلات الطلبات', 'Payment status', 'حالة السداد', 'Export agent', 'وكيل التصدير', 'XLSX builder', 'مُنشئ XLSX', 'Excel file', 'ملف Excel'),
        decisionTemplates: [
          { en: 'Generated export · {n} rows, {q} flagged', ar: 'إنشاء تصدير · {n} صف، {q} مُعلَّم' },
          { en: 'Included document links for {q} orders', ar: 'تضمين روابط المستندات لـ {q} طلبات' }
        ],
        interventionTemplates: [
          { en: 'Export has {q} incomplete rows · review first', ar: 'التصدير به {q} صفوف ناقصة · راجع أولًا' },
          { en: 'Order {n} missing payment date · confirm', ar: 'الطلب {n} بلا تاريخ سداد · أكّد' }
        ],
        activityTemplates: [
          { en: 'Generated {q} exports · {n} rows total', ar: 'إنشاء {q} تصديرات · {n} صف إجمالًا' },
          { en: 'Validated {q} export batches', ar: 'تدقيق {q} دفعات تصدير' }
        ]
      }
    ]
  },
  // ───────────────────────── 7. SUPPLIER PLANNING ─────────────────────────
  {
    slug: 'supplier-planning',
    name: { en: 'Supplier Planning', ar: 'تخطيط الموردين' },
    contextLine: { en: 'Four modules live · demand forecasting, inventory planning, SKU targets and supplier orders.', ar: 'أربع وحدات نشطة · توقّع الطلب وتخطيط المخزون وأهداف الأصناف وطلبات الموردين.' },
    kpiSeeds: [
      { label: { en: 'SKUs planned', ar: 'أصناف مخطّطة' }, format: 'int', range: [40, 140] },
      { label: { en: 'Forecast accuracy', ar: 'دقة التوقّع' }, format: 'pct', range: [70, 90], highlight: true },
      { label: { en: 'Reorder suggestions', ar: 'اقتراحات إعادة طلب' }, format: 'int', range: [6, 26] },
      { label: { en: 'Planned spend', ar: 'الإنفاق المخطّط' }, format: 'sar', range: [8, 28] }
    ],
    solutions: [
      {
        slug: 'demand-forecaster',
        name: { en: 'Demand Forecaster', ar: 'متنبّئ الطلب' },
        context: { en: 'Analyses sales history and seasonality to forecast demand per SKU and category.', ar: 'يحلّل تاريخ المبيعات والموسمية لتوقّع الطلب لكل صنف وفئة.' },
        systems: ['Supabase', 'Claude'],
        kpiSeeds: [
          { label: { en: 'SKUS FORECAST', ar: 'أصناف متوقّعة' }, format: 'int', range: [40, 140] },
          { label: { en: 'FORECAST ACCURACY', ar: 'دقة التوقّع' }, format: 'pct', range: [70, 90], highlight: true },
          { label: { en: 'DEMAND SPIKES', ar: 'قفزات طلب' }, format: 'int', range: [2, 12] },
          { label: { en: 'AVG FORECAST RUN', ar: 'متوسط زمن التوقّع' }, format: 'ms', range: [900, 3000] }
        ],
        chartTitle: { en: 'FORECAST vs ACTUAL · 14D', ar: 'متوقّع مقابل فعلي · 14 يومًا' },
        chartA: { en: 'Forecast', ar: 'متوقّع' }, chartB: { en: 'Actual', ar: 'فعلي' },
        workflow: baseWorkflow('Sales history', 'تاريخ المبيعات', 'Seasonality', 'الموسمية', 'Forecast agent', 'وكيل التوقّع', 'Demand model', 'نموذج الطلب', 'Demand forecast', 'توقّع الطلب'),
        decisionTemplates: [
          { en: 'Forecast SKU {n} · {q}% above last month', ar: 'توقّع الصنف {n} · {q}% فوق الشهر الماضي' },
          { en: 'Detected demand spike for SKU {n}', ar: 'رصد قفزة طلب للصنف {n}' }
        ],
        interventionTemplates: [
          { en: 'SKU {n} forecast uncertain · confirm trend', ar: 'توقّع الصنف {n} غير مؤكّد · أكّد الاتجاه' },
          { en: 'Demand spike on SKU {n} · plan supply', ar: 'قفزة طلب على الصنف {n} · خطّط للتوريد' }
        ],
        activityTemplates: [
          { en: 'Forecast {n} SKUs · {q} spikes detected', ar: 'توقّع {n} صنفًا · رصد {q} قفزات' },
          { en: 'Refreshed demand model for {q} categories', ar: 'تحديث نموذج الطلب لـ {q} فئات' }
        ]
      },
      {
        slug: 'inventory-planner',
        name: { en: 'Inventory Planner', ar: 'مخطّط المخزون' },
        context: { en: 'Compares forecast against stock and cash flow to recommend reorder points.', ar: 'يقارن التوقّع بالمخزون والتدفّق النقدي لاقتراح نقاط إعادة الطلب.' },
        systems: ['Supabase', 'ERP'],
        kpiSeeds: [
          { label: { en: 'REORDER POINTS · 24H', ar: 'نقاط إعادة طلب · 24س' }, format: 'int', range: [6, 26] },
          { label: { en: 'STOCK COVERAGE', ar: 'تغطية المخزون' }, format: 'pct', range: [72, 92], highlight: true },
          { label: { en: 'STOCKOUT RISKS', ar: 'مخاطر نفاد' }, format: 'int', range: [2, 12] },
          { label: { en: 'TIED-UP CAPITAL', ar: 'رأس مال محبوس' }, format: 'sar', range: [5, 18] }
        ],
        chartTitle: { en: 'COVERAGE vs STOCKOUT RISK · 14D', ar: 'التغطية مقابل مخاطر النفاد · 14 يومًا' },
        chartA: { en: 'Coverage', ar: 'تغطية' }, chartB: { en: 'Stockout risk', ar: 'مخاطر نفاد' },
        workflow: baseWorkflow('Demand forecast', 'توقّع الطلب', 'Current stock', 'المخزون الحالي', 'Planner agent', 'وكيل التخطيط', 'Reorder model', 'نموذج إعادة الطلب', 'Reorder plan', 'خطة إعادة الطلب'),
        decisionTemplates: [
          { en: 'Recommended reorder of SKU {n} · {q} units', ar: 'توصية بإعادة طلب الصنف {n} · {q} وحدة' },
          { en: 'Set reorder point for SKU {n}', ar: 'تحديد نقطة إعادة طلب للصنف {n}' }
        ],
        interventionTemplates: [
          { en: 'SKU {n} stockout risk in {q} days · reorder?', ar: 'مخاطر نفاد الصنف {n} خلال {q} أيام · إعادة طلب؟' },
          { en: 'SKU {n} overstocked · pause reorder', ar: 'الصنف {n} فائض · أوقف إعادة الطلب' }
        ],
        activityTemplates: [
          { en: 'Planned {n} reorder points · {q} at risk', ar: 'تخطيط {n} نقطة إعادة طلب · {q} في خطر' },
          { en: 'Updated coverage for {q} SKUs', ar: 'تحديث التغطية لـ {q} صنفًا' }
        ]
      },
      {
        slug: 'sku-monthly-targets',
        name: { en: 'SKU Monthly Targets', ar: 'أهداف الأصناف الشهرية' },
        context: { en: 'Sets and tracks monthly sales targets per SKU against actual movement.', ar: 'يضع ويتابع أهداف المبيعات الشهرية لكل صنف مقابل الحركة الفعلية.' },
        systems: ['Supabase'],
        kpiSeeds: [
          { label: { en: 'SKUS ON TARGET', ar: 'أصناف على الهدف' }, format: 'int', range: [30, 110] },
          { label: { en: 'TARGET ATTAINMENT', ar: 'تحقيق الهدف' }, format: 'pct', range: [64, 88], highlight: true },
          { label: { en: 'BELOW TARGET', ar: 'دون الهدف' }, format: 'int', range: [4, 20] },
          { label: { en: 'TOP SKU REVENUE', ar: 'إيراد أعلى صنف' }, format: 'sar', range: [1, 5] }
        ],
        chartTitle: { en: 'ON-TARGET vs BELOW · 14D', ar: 'على الهدف مقابل دونه · 14 يومًا' },
        chartA: { en: 'On target', ar: 'على الهدف' }, chartB: { en: 'Below', ar: 'دون الهدف' },
        workflow: baseWorkflow('Monthly targets', 'أهداف شهرية', 'Actual sales', 'مبيعات فعلية', 'Target agent', 'وكيل الأهداف', 'Variance model', 'نموذج الفروق', 'Target status', 'حالة الهدف'),
        decisionTemplates: [
          { en: 'SKU {n} hit {q}% of monthly target', ar: 'الصنف {n} حقّق {q}% من الهدف الشهري' },
          { en: 'Flagged SKU {n} below target', ar: 'تعليم الصنف {n} دون الهدف' }
        ],
        interventionTemplates: [
          { en: 'SKU {n} at {q}% of target · push sales', ar: 'الصنف {n} عند {q}% من الهدف · ادفع المبيعات' },
          { en: 'SKU {n} target unrealistic · adjust', ar: 'هدف الصنف {n} غير واقعي · عدّله' }
        ],
        activityTemplates: [
          { en: 'Tracked {n} SKU targets · {q} below', ar: 'تتبّع {n} هدف صنف · {q} دون الهدف' },
          { en: 'Updated targets for {q} SKUs', ar: 'تحديث أهداف {q} أصناف' }
        ]
      },
      {
        slug: 'supplier-order-recommender',
        name: { en: 'Supplier Order Recommender', ar: 'موصي طلبات الموردين' },
        context: { en: 'Recommends supplier order quantities from demand, budget and supplier pricing.', ar: 'يوصي بكميات طلب الموردين بناءً على الطلب والميزانية وأسعار الموردين.' },
        systems: ['Supabase', 'Claude', 'ERP'],
        kpiSeeds: [
          { label: { en: 'RECOMMENDATIONS · 24H', ar: 'توصيات · 24س' }, format: 'int', range: [4, 20] },
          { label: { en: 'COST SAVINGS', ar: 'وفورات التكلفة' }, format: 'pct', range: [6, 18], highlight: true },
          { label: { en: 'PENDING APPROVAL', ar: 'بانتظار الاعتماد' }, format: 'int', range: [2, 10] },
          { label: { en: 'RECOMMENDED SPEND', ar: 'الإنفاق الموصى به' }, format: 'sar', range: [6, 24] }
        ],
        chartTitle: { en: 'RECOMMENDED vs APPROVED · 14D', ar: 'موصى به مقابل معتمَد · 14 يومًا' },
        chartA: { en: 'Recommended', ar: 'موصى به' }, chartB: { en: 'Approved', ar: 'معتمَد' },
        workflow: baseWorkflow('Demand & budget', 'الطلب والميزانية', 'Supplier prices', 'أسعار الموردين', 'Recommender agent', 'وكيل التوصية', 'Purchase plan', 'خطة الشراء', 'Order proposal', 'مقترح الطلب'),
        decisionTemplates: [
          { en: 'Recommended ordering {q} units of SKU {n}', ar: 'توصية بطلب {q} وحدة من الصنف {n}' },
          { en: 'Selected cheapest supplier for SKU {n}', ar: 'اختيار أرخص مورّد للصنف {n}' }
        ],
        interventionTemplates: [
          { en: 'Plan {n} exceeds monthly budget · review', ar: 'الخطة {n} تتجاوز الميزانية الشهرية · راجع' },
          { en: 'Supplier price for SKU {n} rose {q}% · confirm', ar: 'سعر مورّد الصنف {n} ارتفع {q}% · أكّد' }
        ],
        activityTemplates: [
          { en: 'Recommended {n} supplier orders · {q} approved', ar: 'توصية بـ {n} طلب مورّد · اعتماد {q}' },
          { en: 'Compared pricing across {q} suppliers', ar: 'مقارنة الأسعار عبر {q} موردين' }
        ]
      }
    ]
  }
]
