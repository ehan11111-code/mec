import type { Bi } from '@/lib/mock/types'

// The 10 n8n workflows from the project brief (§9), as an action catalog. Each "Run" button POSTs to
// the webhook URL in the matching env var; until that's set the UI shows a "Connect n8n" state.
export type Automation = {
  id: string; name: Bi; trigger: Bi; dept: string
  // internal = runs on MEC's own data/operations (the system uses the output);
  // external = output is pulled from the outside world (intake, market intelligence).
  kind: 'internal' | 'external'
  steps: Bi[]
  webhookEnv: string   // e.g. NEXT_PUBLIC_N8N_EMAIL_INTAKE
}

export const automations: Automation[] = [
  {
    id: 'erp-sync', dept: 'documents', kind: 'internal', webhookEnv: 'NEXT_PUBLIC_N8N_ERP_SYNC',
    name: { en: 'ERP Scheduled Sync', ar: 'مزامنة ERP المجدولة' },
    trigger: { en: 'Every 6 hours (timer)', ar: 'كل 6 ساعات (مؤقّت)' },
    steps: [
      { en: 'Fetch new ERP records', ar: 'جلب سجلات ERP الجديدة' },
      { en: 'Normalise to portal shape', ar: 'توحيد إلى شكل البوابة' },
      { en: 'Upsert into Supabase', ar: 'تحديث/إدراج في Supabase' },
      { en: 'Portal reads live data', ar: 'البوابة تقرأ البيانات الحية' }
    ]
  },
  {
    id: 'supply-intel', dept: 'supplier-planning', kind: 'external', webhookEnv: 'NEXT_PUBLIC_N8N_SUPPLY_INTEL',
    name: { en: 'Supply-Market Intelligence', ar: 'استخبارات سوق التوريد' },
    trigger: { en: 'Every 12 hours (timer)', ar: 'كل 12 ساعة (مؤقّت)' },
    steps: [
      { en: 'Gather real news + advisory signals', ar: 'جمع الأخبار والتنبيهات الحقيقية' },
      { en: 'GPT synthesis — forecast + risks', ar: 'تحليل GPT — توقّع + مخاطر' },
      { en: 'Drop any unsourced claim', ar: 'حذف أي ادعاء بلا مصدر' },
      { en: 'Store cited intel in Supabase', ar: 'حفظ الاستخبارات الموثّقة في Supabase' }
    ]
  },
  {
    id: 'email-intake', dept: 'documents', kind: 'external', webhookEnv: 'NEXT_PUBLIC_N8N_EMAIL_INTAKE',
    name: { en: 'Email Document Intake', ar: 'استقبال مستندات البريد' },
    trigger: { en: 'New order-related email with attachment', ar: 'بريد جديد متعلق بطلب مع مرفق' },
    steps: [
      { en: 'Fetch email + attachments', ar: 'جلب البريد والمرفقات' },
      { en: 'Classify + OCR parse', ar: 'تصنيف + استخراج ضوئي' },
      { en: 'Match to client / order', ar: 'مطابقة بالعميل / الطلب' },
      { en: 'Create document record + notify', ar: 'إنشاء سجل مستند + إشعار' }
    ]
  },
  {
    id: 'whatsapp-intake', dept: 'documents', kind: 'external', webhookEnv: 'NEXT_PUBLIC_N8N_WHATSAPP_INTAKE',
    name: { en: 'WhatsApp Message & Document Intake', ar: 'استقبال رسائل ومستندات واتساب' },
    trigger: { en: 'New WhatsApp message or media', ar: 'رسالة أو وسائط واتساب جديدة' },
    steps: [
      { en: 'Identify sender', ar: 'تحديد المُرسِل' },
      { en: 'Download media', ar: 'تنزيل الوسائط' },
      { en: 'Extract order details', ar: 'استخراج تفاصيل الطلب' },
      { en: 'Create lead / order / task', ar: 'إنشاء عميل / طلب / مهمة' }
    ]
  },
  {
    id: 'order-approval', dept: 'approvals', kind: 'internal', webhookEnv: 'NEXT_PUBLIC_N8N_ORDER_APPROVAL',
    name: { en: 'Order Approval Assistant', ar: 'مساعد اعتماد الطلبات' },
    trigger: { en: 'New order submitted', ar: 'تقديم طلب جديد' },
    steps: [
      { en: 'Fetch client history + stock', ar: 'جلب سجل العميل + المخزون' },
      { en: 'Compute margin + payment risk', ar: 'حساب الهامش + مخاطر السداد' },
      { en: 'Generate recommendation', ar: 'إنشاء التوصية' },
      { en: 'Notify approval manager', ar: 'إشعار مدير الاعتماد' }
    ]
  },
  {
    id: 'warehouse-dispatch', dept: 'warehouse', kind: 'internal', webhookEnv: 'NEXT_PUBLIC_N8N_WAREHOUSE_DISPATCH',
    name: { en: 'Warehouse Dispatch', ar: 'إرسال المستودع' },
    trigger: { en: 'Order approved', ar: 'اعتماد الطلب' },
    steps: [
      { en: 'Reserve stock + assign batch', ar: 'حجز المخزون + تخصيص دفعة' },
      { en: 'Set loading deadline', ar: 'تحديد موعد التحميل' },
      { en: 'Send warehouse checklist', ar: 'إرسال قائمة المستودع' },
      { en: 'Update order status', ar: 'تحديث حالة الطلب' }
    ]
  },
  {
    id: 'driver-route', dept: 'logistics', kind: 'internal', webhookEnv: 'NEXT_PUBLIC_N8N_DRIVER_ROUTE',
    name: { en: 'Driver & Route Status', ar: 'حالة السائق والمسار' },
    trigger: { en: 'Order loaded / dispatched', ar: 'تحميل / إرسال الطلب' },
    steps: [
      { en: 'Assign driver + send details', ar: 'تخصيص سائق + إرسال التفاصيل' },
      { en: 'Update client status', ar: 'تحديث حالة العميل' },
      { en: 'Track delivery', ar: 'تتبّع التسليم' },
      { en: 'Receive delivery proof', ar: 'استلام إثبات التسليم' }
    ]
  },
  {
    id: 'delivery-note', dept: 'logistics', kind: 'internal', webhookEnv: 'NEXT_PUBLIC_N8N_DELIVERY_NOTE',
    name: { en: 'Delivery Note Processing', ar: 'معالجة إشعار التسليم' },
    trigger: { en: 'Delivery note uploaded', ar: 'رفع إشعار التسليم' },
    steps: [
      { en: 'Extract + match to order', ar: 'استخراج + مطابقة بالطلب' },
      { en: 'Validate signature / stamp', ar: 'التحقق من التوقيع / الختم' },
      { en: 'Mark delivered + due date', ar: 'تأكيد التسليم + موعد الاستحقاق' },
      { en: 'Notify finance', ar: 'إشعار المالية' }
    ]
  },
  {
    id: 'payment-followup', dept: 'finance', kind: 'internal', webhookEnv: 'NEXT_PUBLIC_N8N_PAYMENT_FOLLOWUP',
    name: { en: 'Payment Deadline & Follow-up', ar: 'مواعيد السداد والمتابعة' },
    trigger: { en: 'Order delivered / scheduled', ar: 'تسليم الطلب / مجدول' },
    steps: [
      { en: 'Create due date', ar: 'إنشاء موعد الاستحقاق' },
      { en: 'Send reminders (WhatsApp/email)', ar: 'إرسال تذكيرات (واتساب/بريد)' },
      { en: 'Flag overdue + escalate', ar: 'تعليم المتأخر + التصعيد' },
      { en: 'Update client risk', ar: 'تحديث مخاطر العميل' }
    ]
  },
  {
    id: 'excel-export', dept: 'finance', kind: 'internal', webhookEnv: 'NEXT_PUBLIC_N8N_EXCEL_EXPORT',
    name: { en: 'Accounting Excel Export', ar: 'تصدير Excel المحاسبي' },
    trigger: { en: 'Scheduled / manual export', ar: 'تصدير مجدول / يدوي' },
    steps: [
      { en: 'Fetch orders + payments', ar: 'جلب الطلبات + المدفوعات' },
      { en: 'Build clean XLSX + doc links', ar: 'بناء XLSX نظيف + روابط' },
      { en: 'Save export', ar: 'حفظ التصدير' },
      { en: 'Send to accountant', ar: 'إرسال للمحاسب' }
    ]
  },
  {
    id: 'supplier-planning', dept: 'supplier-planning', kind: 'internal', webhookEnv: 'NEXT_PUBLIC_N8N_SUPPLIER_PLANNING',
    name: { en: 'Supplier Demand Planning', ar: 'تخطيط طلب الموردين' },
    trigger: { en: 'Scheduled / manual planning', ar: 'تخطيط مجدول / يدوي' },
    steps: [
      { en: 'Analyse sales + inventory', ar: 'تحليل المبيعات + المخزون' },
      { en: 'Recommend order quantities', ar: 'توصية بكميات الطلب' },
      { en: 'Route for superior approval', ar: 'توجيه لاعتماد المسؤول' },
      { en: 'Generate supplier PO', ar: 'إنشاء أمر شراء للمورد' }
    ]
  },
  {
    id: 'learning', dept: 'supplier-planning', kind: 'internal', webhookEnv: 'NEXT_PUBLIC_N8N_LEARNING',
    name: { en: 'System Learning & Improvement', ar: 'تعلّم النظام والتحسين' },
    trigger: { en: 'After each completed cycle', ar: 'بعد كل دورة مكتملة' },
    steps: [
      { en: 'Compare AI rec vs outcome', ar: 'مقارنة التوصية بالنتيجة' },
      { en: 'Update risk + SKU insights', ar: 'تحديث المخاطر + رؤى الأصناف' },
      { en: 'Suggest rule improvements', ar: 'اقتراح تحسين القواعد' },
      { en: 'Log to audit trail', ar: 'تسجيل في سجل التدقيق' }
    ]
  }
]

// Webhook URLs are read from NEXT_PUBLIC_* env (must be inlined at build for the browser).
export const webhookUrls: Record<string, string | undefined> = {
  NEXT_PUBLIC_N8N_ERP_SYNC: process.env.NEXT_PUBLIC_N8N_ERP_SYNC,
  NEXT_PUBLIC_N8N_SUPPLY_INTEL: process.env.NEXT_PUBLIC_N8N_SUPPLY_INTEL,
  NEXT_PUBLIC_N8N_EMAIL_INTAKE: process.env.NEXT_PUBLIC_N8N_EMAIL_INTAKE,
  NEXT_PUBLIC_N8N_WHATSAPP_INTAKE: process.env.NEXT_PUBLIC_N8N_WHATSAPP_INTAKE,
  NEXT_PUBLIC_N8N_ORDER_APPROVAL: process.env.NEXT_PUBLIC_N8N_ORDER_APPROVAL,
  NEXT_PUBLIC_N8N_WAREHOUSE_DISPATCH: process.env.NEXT_PUBLIC_N8N_WAREHOUSE_DISPATCH,
  NEXT_PUBLIC_N8N_DRIVER_ROUTE: process.env.NEXT_PUBLIC_N8N_DRIVER_ROUTE,
  NEXT_PUBLIC_N8N_DELIVERY_NOTE: process.env.NEXT_PUBLIC_N8N_DELIVERY_NOTE,
  NEXT_PUBLIC_N8N_PAYMENT_FOLLOWUP: process.env.NEXT_PUBLIC_N8N_PAYMENT_FOLLOWUP,
  NEXT_PUBLIC_N8N_EXCEL_EXPORT: process.env.NEXT_PUBLIC_N8N_EXCEL_EXPORT,
  NEXT_PUBLIC_N8N_SUPPLIER_PLANNING: process.env.NEXT_PUBLIC_N8N_SUPPLIER_PLANNING,
  NEXT_PUBLIC_N8N_LEARNING: process.env.NEXT_PUBLIC_N8N_LEARNING
}
