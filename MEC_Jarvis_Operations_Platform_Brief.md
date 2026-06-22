# MEC Operations Automation Platform — Claude Code Project Brief

## 1. Project Owner

**Agency:** Jarvis AI Agency  
**Client:** MEC  
**Project Type:** Full operational automation platform + client portal + AI-assisted approval and documentation system  
**Main Build Target:** A secure web-based client portal, supported by n8n workflows, AI agents, document automation, CRM, order tracking, warehouse coordination, and financial/exportable records.

---

## 2. High-Level Business Context

MEC is an importing and distribution company that sells food products in Saudi Arabia. The company currently imports and sells products such as:

- Meat
- Chicken
- Vegetables
- Potatoes, planned or expanding later
- Other imported food SKUs from different countries

MEC sells to business clients through salespeople. Salespeople visit clients directly, collect orders, follow up with them, and communicate order details internally through WhatsApp and email.

The current operational flow relies heavily on:

- WhatsApp messages
- Emails
- Manual document exchange
- Salesperson follow-ups
- Internal approvals
- Warehouse coordination
- Driver coordination
- Receipts, quotations, purchase orders, promissory notes, delivery notes, and stamped documents

Jarvis will build a system that centralizes this operation, automates documentation, tracks every order, assists in approval decisions, coordinates warehouse dispatch, notifies clients, and keeps all historical client and transaction data in a structured CRM.

The main goal is to reduce manual work, prevent lost information, improve approval accuracy, improve warehouse coordination, create financial visibility, and make all documents/accounting exports clean and traceable.

---

## 3. Core Project Goal

Build a full MEC Operations Platform where MEC can manage:

1. Order status
2. Warehouse communication
3. Supply and batch status
4. Document authentication and organization
5. Receipts, quotations, purchase orders, delivery notes, and promissory notes
6. Approval assistant for order margin, quantity, stock affordability, and risk
7. Route status from warehouse to client
8. Client notifications
9. Delivery documentation
10. WhatsApp and email document collection
11. Excel/accounting export
12. Full CRM with client history
13. Supplier order planning, demand analysis, budget planning, inventory analysis, and SKU monthly targets
14. Internal superior approval for supplier purchasing

Everything should be visible through Jarvis’ own client portal website.

---

## 4. Product Vision

The system should act as MEC’s operational command center.

Instead of scattered WhatsApp messages, emails, Excel sheets, and manual approvals, the system should create one structured flow:

**Salesperson creates or forwards an order → AI/document parser captures data → system validates client, SKU, quantity, price, margin, stock, and risk → approval assistant recommends approve/deny → manager approves → warehouse receives dispatch request → driver/route is assigned → client receives status notification → delivery note is generated/authenticated → payment deadline is tracked → accounting export is prepared.**

---

## 5. Main Users and Roles

### 5.1 Admin / Owner
Full access to:
- All clients
- All orders
- All documents
- Approval rules
- Margins
- Inventory
- Warehouse status
- Supplier planning
- Reports
- Accounting exports
- User management

### 5.2 Salesperson
Can:
- Add leads
- Add clients
- Submit orders
- Upload or forward WhatsApp/email documents
- See client history
- Follow up with payment deadlines
- Track order status for their own clients

Cannot:
- Approve high-risk orders
- Change margins or pricing rules
- Edit accounting records after lock

### 5.3 Approval Manager
Can:
- Review orders
- See AI approval recommendation
- Approve, reject, or request changes
- Review margins and stock availability
- Authenticate order documents
- Approve internal supplier purchase plans

### 5.4 Warehouse Team
Can:
- View approved orders
- Confirm stock availability
- Confirm batch status
- Prepare picking/loading
- Mark dispatched
- Assign or confirm driver
- Upload loading evidence if needed

### 5.5 Driver / Logistics User
Can:
- See assigned route
- Mark order as picked up
- Mark order as on the way
- Mark delivered
- Upload delivery confirmation
- Upload signed/stamped delivery note

### 5.6 Accountant / Finance
Can:
- View payment status
- Export all order documents and transaction data
- Track payment deadlines
- See receipts, quotations, POs, delivery notes, and promissory notes
- Export clean Excel files

### 5.7 Client / Customer
Can:
- Receive notifications
- View order status
- Receive delivery note
- Confirm receipt if required
- See basic order timeline if portal access is enabled

---

## 6. Main System Modules

## 6.1 Client Portal

A secure web portal hosted under Jarvis or MEC’s domain/subdomain.

Example:

- `mec.jarvisksa.com`
- `portal.mec.com`
- Or any agreed client portal domain

The portal should include:

- Login/authentication
- Role-based dashboard
- Order dashboard
- Client CRM
- Inventory overview
- Warehouse dashboard
- Document center
- Approval queue
- Delivery status
- Finance/export center
- Supplier planning module
- AI assistant panel

Recommended stack:

- Frontend: Next.js or React
- Hosting: Vercel
- Auth: Supabase Auth, Clerk, or Auth0
- Database: Supabase Postgres
- File Storage: Supabase Storage or AWS S3
- Workflow Automation: n8n
- AI/LLM: Claude API, OpenAI API, or hybrid model routing
- Email Parsing: Gmail/Outlook integration or IMAP
- WhatsApp: WhatsApp Cloud API or approved provider
- Excel Export: server-generated XLSX
- PDF Generation: server-side PDF generation
- Observability: Sentry + workflow logs + database audit logs

---

## 6.2 Order Status System

The order system should track the full lifecycle of every order.

### Order Statuses

Recommended order status flow:

1. Lead received
2. Client verified
3. Order drafted
4. Documents pending
5. Under approval
6. Approved
7. Rejected
8. Waiting warehouse confirmation
9. Stock confirmed
10. Stock issue / partial availability
11. Picking in progress
12. Loading scheduled
13. Loaded
14. Dispatched
15. On route
16. Delivered
17. Delivery note received
18. Payment pending
19. Payment overdue
20. Paid
21. Closed
22. Cancelled

Each status update should include:

- Timestamp
- User or automation that changed it
- Notes
- Related documents
- Internal comments
- Client-facing visibility flag

---

## 6.3 Warehouse Contact, Supply, and Batch Status System

The warehouse module should coordinate approved orders and available stock.

The system should track:

- SKU
- Product category
- Country of origin
- Supplier
- Batch number
- Expiry date
- Available quantity
- Reserved quantity
- Damaged/blocked quantity
- Warehouse location
- Cold storage requirements
- Loading deadline
- Dispatch readiness
- Vehicle/driver assignment

Warehouse users should receive automatic alerts when:

- An order is approved
- Stock needs confirmation
- Loading deadline is near
- A batch is expiring soon
- A requested quantity exceeds available stock
- A partial dispatch is required
- The order has been delayed

---

## 6.4 Documentation Authentication System

MEC uses receipts, quotations, purchase orders, promissory notes, delivery notes, stamped documents, and email confirmations.

The system should collect, classify, validate, and store these documents.

### Document Types

- Quotation
- Purchase order
- Sales order
- Receipt
- Invoice
- Promissory note / سند لأمر
- Delivery note
- Stamped approval
- Warehouse dispatch confirmation
- Client confirmation
- Supplier quotation
- Supplier invoice
- Internal approval document
- Payment proof

### Document Processing

Documents may come from:

- Email
- WhatsApp
- Manual upload
- Scanned PDF
- Image
- Excel
- Word document

The system should:

1. Fetch document from email or WhatsApp
2. Detect document type
3. Extract key fields
4. Match it to client/order/SKU
5. Check whether required fields are missing
6. Flag unclear or low-confidence extraction
7. Store original file
8. Store extracted structured data
9. Create searchable records
10. Allow manual review/correction
11. Lock documents after final approval if needed

### Key Fields to Extract

- Client name
- Client contact
- Order number
- PO number
- Quotation number
- Product/SKU
- Quantity
- Unit price
- Total price
- VAT
- Payment terms
- Delivery date
- Required delivery location
- Stamp/signature status
- Promissory note status
- Due date
- Salesperson
- Approver
- Warehouse
- Driver
- Notes

---

## 6.5 Approval Assistant

The approval assistant is one of the most important features.

It should help the person in charge decide whether to approve or reject an order.

The assistant should analyze:

- Client history
- Client payment behavior
- Outstanding balance
- Previous delays
- Current stock
- Requested quantity
- SKU monthly target
- Margin
- Cost price
- Selling price
- Minimum allowed margin
- Delivery cost
- Warehouse availability
- Batch expiry risk
- Demand forecast
- Budget impact
- Credit/payment risk
- Whether MEC can afford the quantity
- Whether the order supports monthly strategy

### Approval Recommendation Output

For each order, the AI should produce a structured approval report:

- Recommendation: Approve / Reject / Approve with conditions / Needs human review
- Confidence level
- Order summary
- Client summary
- Quantity analysis
- Margin analysis
- Stock availability
- Payment risk
- Delivery risk
- Documentation status
- Missing documents
- Suggested action
- Reasoning in simple business language

Example:

> This order is recommended for approval because the requested quantity is available, the margin is above the minimum threshold, and the client has no overdue payments. However, the delivery should be scheduled before batch expiry risk increases.

The AI must never approve automatically unless MEC explicitly allows auto-approval rules. The AI should recommend, explain, and prepare the decision for the manager.

---

## 6.6 Route Status and Client Notification System

After approval and warehouse dispatch, the client should receive updates.

### Client-Facing Statuses

- Order confirmed
- Preparing at warehouse
- Loaded
- On the way
- Delivered
- Delivery note ready
- Payment due

Notifications can be sent through:

- WhatsApp
- Email
- SMS if needed later

### Notification Examples

- “Your order has been approved and is being prepared.”
- “Your order is loaded and on the way.”
- “Your order has been delivered. Please find the delivery note attached.”
- “Payment is due by [date].”

The system should support Arabic and English notifications.

---

## 6.7 Delivery Notes Into Documentation and Order Status

When delivery is completed:

1. Driver uploads or forwards the delivery note
2. System extracts delivery details
3. System matches delivery note to order
4. System checks signature/stamp if available
5. Status changes to “Delivered”
6. Payment deadline is generated
7. Finance is notified
8. Client history is updated
9. Document is stored in the order record
10. Accounting export is updated

---

## 6.8 Email and WhatsApp Data Gathering Into Excel

All documents and transaction data fetched from emails and WhatsApp should be gathered into structured records.

The system should create exportable Excel files for accounting.

### Export Should Include

- Client name
- Order number
- SKU
- Quantity
- Unit price
- Total
- VAT
- Margin
- Payment status
- Due date
- Salesperson
- Approver
- Warehouse status
- Delivery status
- Document links
- Promissory note status
- Invoice/receipt status
- Notes
- Created date
- Delivery date
- Payment date

The export should be clean enough to send to an accountant or import into accounting software.

---

## 6.9 Full CRM System

The CRM should contain full client historical data.

### CRM Fields

- Client name
- Company name
- Contact person
- Phone
- WhatsApp number
- Email
- City
- Location
- Industry/category
- Salesperson assigned
- Client status
- Lead source
- First contact date
- Last contact date
- Total orders
- Total revenue
- Average order value
- Payment behavior
- Overdue history
- Preferred SKUs
- Notes
- Documents
- Follow-up tasks
- Risk score

### CRM Timeline

Each client should have a timeline:

- Lead created
- Salesperson visit
- Quotation sent
- PO received
- Order approved/rejected
- Warehouse dispatched
- Delivered
- Payment pending
- Paid
- Follow-up needed
- Complaint or issue
- New opportunity

---

## 7. Internal Supplier Planning Module

MEC also needs internal planning before ordering from suppliers.

The system should help analyze:

- Demand
- Sales strategy
- Budget
- Inventory
- Monthly target for each SKU
- Supplier prices
- Country/source availability
- Expected delivery timeline
- Stock risk
- Expiry risk
- Cash flow impact

### Internal Purchase Approval Flow

1. System collects sales and demand data
2. System checks inventory and SKU movement
3. System recommends supplier order quantities
4. Manager reviews the plan
5. Superior approves or rejects
6. Supplier PO is generated
7. Supplier documentation is stored
8. Incoming shipment is tracked
9. Inventory is updated when received

---

## 8. Data Model — Recommended Tables

Claude Code should design the database around these core tables.

### Users
- id
- name
- email
- phone
- role
- department
- active
- created_at

### Clients
- id
- company_name
- contact_name
- phone
- whatsapp
- email
- city
- address
- location_url
- sales_owner_id
- status
- risk_score
- payment_terms_days
- created_at

### SKUs
- id
- sku_code
- name
- category
- origin_country
- supplier_id
- unit
- cost_price
- default_selling_price
- minimum_margin
- active

### Inventory
- id
- sku_id
- warehouse_id
- batch_number
- expiry_date
- available_quantity
- reserved_quantity
- blocked_quantity
- status
- updated_at

### Orders
- id
- order_number
- client_id
- salesperson_id
- status
- total_amount
- total_cost
- gross_margin
- margin_percentage
- payment_terms_days
- due_date
- approval_status
- approval_manager_id
- delivery_status
- warehouse_id
- driver_id
- created_at

### Order Items
- id
- order_id
- sku_id
- quantity
- unit_price
- cost_price
- margin
- batch_id
- notes

### Documents
- id
- order_id
- client_id
- document_type
- file_url
- source
- source_message_id
- extracted_data_json
- confidence_score
- authenticated_status
- reviewed_by
- created_at

### Approvals
- id
- order_id
- recommendation
- ai_summary
- risk_flags_json
- margin_analysis_json
- stock_analysis_json
- final_decision
- decided_by
- decided_at

### Warehouses
- id
- name
- location
- contact_person
- phone
- email

### Dispatches
- id
- order_id
- warehouse_id
- driver_id
- loading_deadline
- loaded_at
- dispatched_at
- delivered_at
- status
- proof_document_id

### Payments
- id
- order_id
- client_id
- amount_due
- amount_paid
- due_date
- paid_at
- status
- proof_document_id

### Suppliers
- id
- name
- country
- contact_name
- phone
- email
- payment_terms
- notes

### Supplier Orders
- id
- supplier_id
- status
- budget_amount
- expected_arrival_date
- approved_by
- created_at

### Supplier Order Items
- id
- supplier_order_id
- sku_id
- quantity
- estimated_cost
- target_month

### Audit Logs
- id
- entity_type
- entity_id
- action
- old_value_json
- new_value_json
- user_id
- automation_id
- created_at

---

## 9. n8n Workflows Required

Claude Code should help design, document, and support these n8n workflows.

## 9.1 Email Document Intake Workflow

Trigger:
- New email received with attachment or order-related keywords

Steps:
1. Fetch email
2. Extract sender, subject, body, attachments
3. Classify email type
4. Send attachment/body to OCR/document parser
5. Extract order/document fields
6. Match client/order if possible
7. Create or update document record
8. Notify responsible user if review is needed
9. Log workflow result

Tools:
- Gmail/Outlook node
- PDF/OCR parser
- Claude/OpenAI node
- Supabase/Postgres node
- Slack/WhatsApp/email notification node

---

## 9.2 WhatsApp Message and Document Intake Workflow

Trigger:
- New WhatsApp message or document

Steps:
1. Receive WhatsApp message through WhatsApp Cloud API/provider
2. Identify sender
3. Match sender to client, salesperson, warehouse, or driver
4. Download document/media if present
5. Classify message intent
6. Extract order details
7. Create lead/order/document/task
8. Ask for missing information if needed
9. Save conversation history
10. Notify internal owner

---

## 9.3 Order Approval Assistant Workflow

Trigger:
- New order submitted or documents completed

Steps:
1. Fetch order data
2. Fetch client history
3. Fetch inventory and batch availability
4. Fetch SKU margin rules
5. Fetch outstanding payments
6. Calculate gross margin and margin percentage
7. Check quantity affordability
8. Check payment risk
9. Check delivery feasibility
10. Generate AI recommendation
11. Save approval report
12. Notify approval manager

---

## 9.4 Warehouse Dispatch Workflow

Trigger:
- Order approved

Steps:
1. Notify warehouse
2. Reserve stock
3. Assign batch
4. Set loading deadline
5. Create dispatch record
6. Send warehouse checklist
7. Wait for warehouse confirmation
8. Update order status
9. Notify salesperson/client if needed

---

## 9.5 Driver and Route Status Workflow

Trigger:
- Warehouse marks order loaded or dispatched

Steps:
1. Assign driver
2. Send delivery details to driver
3. Update client-facing status to “On the way”
4. Notify client
5. Track delivery status through driver updates
6. Receive delivery proof
7. Update order as delivered
8. Trigger delivery note processing

---

## 9.6 Delivery Note Processing Workflow

Trigger:
- Driver uploads delivery note or document arrives by email/WhatsApp

Steps:
1. Extract delivery note data
2. Match to order
3. Validate signature/stamp
4. Save document
5. Update order status to delivered
6. Generate payment deadline
7. Notify finance
8. Notify client if needed

---

## 9.7 Payment Deadline and Follow-Up Workflow

Trigger:
- Order delivered

Steps:
1. Create payment due date, usually around 7 days after delivery unless client-specific terms differ
2. Send internal reminder before due date
3. Send client reminder if allowed
4. Mark overdue if unpaid
5. Escalate overdue payment
6. Update client risk score

---

## 9.8 Accounting Excel Export Workflow

Trigger:
- Manual export request or scheduled monthly/weekly export

Steps:
1. Fetch order records
2. Fetch related documents
3. Fetch payment status
4. Fetch client data
5. Generate Excel file
6. Include links to documents
7. Save export
8. Send/download for accountant

---

## 9.9 Supplier Demand Planning Workflow

Trigger:
- Scheduled weekly/monthly or manual planning request

Steps:
1. Fetch sales history
2. Fetch current inventory
3. Fetch monthly SKU targets
4. Fetch supplier pricing
5. Analyze demand
6. Recommend supplier order quantities
7. Create internal purchase plan
8. Send for superior approval
9. Generate supplier PO after approval

---

## 9.10 System Learning and Improvement Workflow

Trigger:
- After every completed order, approval, delivery, or payment cycle

Steps:
1. Review outcome
2. Compare AI recommendation against actual result
3. Update client risk score
4. Update SKU movement insights
5. Update approval rule suggestions
6. Log failure points
7. Improve prompts/rules after human approval
8. Maintain audit trail

Important:
The system should not silently change business-critical rules without approval. It can suggest improvements, but a human should approve changes to margin thresholds, risk rules, and automation behavior.

---

## 10. AI Assistant Requirements

The AI assistant should be used for:

- Reading and summarizing documents
- Extracting order details
- Classifying emails and WhatsApp messages
- Preparing approval recommendations
- Explaining margin and quantity risks
- Detecting missing documents
- Drafting client/warehouse/supplier messages
- Creating follow-up reminders
- Preparing reports
- Answering internal questions about orders, clients, and inventory

### AI Assistant Rules

The assistant must:

- Be factual
- Never invent missing data
- Clearly say when information is missing
- Show confidence level for extracted data
- Ask for human review when extraction is uncertain
- Keep all reasoning tied to actual order, client, SKU, inventory, and payment data
- Never approve orders automatically unless explicit business rules allow it
- Keep audit logs of every recommendation
- Make outputs simple and business-readable
- Support English and Arabic if needed

---

## 11. Recommended Integrations

### Required / Strongly Recommended

- Supabase: database, authentication, storage
- n8n: workflow automation
- Vercel: portal hosting
- WhatsApp Cloud API or approved WhatsApp provider
- Gmail or Microsoft Outlook integration
- Claude API for reasoning and document understanding
- OCR/document parser for PDFs/scans/images
- Excel generation library
- PDF generation library
- Sentry or similar error tracking
- PostHog or analytics tool for product usage

### Optional Later

- Accounting software integration
- ERP integration
- SAP integration if MEC uses it later
- Google Maps for route/location support
- SMS provider
- E-signature provider
- Barcode/QR scanning for warehouse batches
- Mobile driver app or PWA

---

## 12. Security and Compliance Requirements

The system must include:

- Secure login
- Role-based access control
- Protected file storage
- Audit logs
- User activity logs
- Data backup
- Document versioning
- Permission control by department
- Encryption in transit
- Secure environment variables
- No API keys exposed in frontend
- Manual override controls
- Approval history
- File access logs
- Data retention policy

Sensitive documents like promissory notes, payment proofs, and signed documents should have stricter access.

---

## 13. Dashboard Requirements

## 13.1 Admin Dashboard

Show:

- Total orders
- Orders pending approval
- Orders delayed
- Revenue
- Gross margin
- Overdue payments
- Top clients
- Top SKUs
- Inventory alerts
- Warehouse delays
- Supplier order status

## 13.2 Approval Dashboard

Show:

- Orders awaiting approval
- AI recommendation
- Margin
- Quantity
- Stock availability
- Client payment risk
- Required documents
- Approve/reject buttons

## 13.3 Warehouse Dashboard

Show:

- Approved orders to prepare
- Loading deadlines
- SKU and batch details
- Reserved quantity
- Dispatch status
- Driver assignment
- Delivery notes pending

## 13.4 CRM Dashboard

Show:

- Clients
- Salesperson ownership
- Client history
- Follow-up tasks
- Order timeline
- Payment behavior
- Client risk score

## 13.5 Finance Dashboard

Show:

- Delivered orders
- Payment due dates
- Overdue payments
- Receipts
- Promissory notes
- Export button
- Accounting-ready records

---

## 14. Workflow Reliability and Debugging Requirements

Because this system will run operationally, Claude Code should design it with debugging and reliability from the start.

Each automation should include:

- Workflow run ID
- Input payload log
- Output payload log
- Success/failure status
- Retry logic
- Error notification
- Manual review fallback
- Duplicate prevention
- Idempotency keys
- Human approval checkpoints
- Clear error messages
- Admin logs

Important examples:

- Do not create duplicate orders from the same email.
- Do not attach a document to the wrong client if confidence is low.
- Do not approve orders without stock/margin validation.
- Do not mark delivered without delivery confirmation.
- Do not export incomplete accounting records without warning.

---

## 15. Suggested Build Phases

## Phase 1 — Foundation

Build:

- Authentication
- Roles
- Supabase database
- Client portal layout
- CRM basic structure
- Order table
- Document upload
- Manual order creation
- Basic order status tracking

Goal:
Create the operational base before automating everything.

---

## Phase 2 — Documents and Intake

Build:

- Email intake
- WhatsApp intake
- Document parser
- OCR
- Document classification
- Extracted data review screen
- Match documents to orders/clients

Goal:
Stop losing information from email and WhatsApp.

---

## Phase 3 — Approval Assistant

Build:

- Margin calculations
- Stock validation
- Client payment risk
- AI approval report
- Approval dashboard
- Approve/reject workflow

Goal:
Make order approval faster, smarter, and documented.

---

## Phase 4 — Warehouse and Delivery

Build:

- Warehouse dashboard
- Batch assignment
- Dispatch workflow
- Driver status
- Client notifications
- Delivery note processing

Goal:
Connect approval to actual delivery.

---

## Phase 5 — Finance and Accounting

Build:

- Payment tracking
- Due date reminders
- Promissory note tracking
- Receipt/invoice tracking
- Excel export
- Accounting-ready records

Goal:
Give MEC clean financial data.

---

## Phase 6 — Supplier Planning and Strategy

Build:

- Demand analysis
- Inventory planning
- Monthly SKU targets
- Supplier order recommendations
- Superior approval flow
- Supplier PO documentation

Goal:
Help MEC order smarter from suppliers.

---

## Phase 7 — Optimization and Learning

Build:

- Outcome tracking
- AI recommendation feedback
- Client risk score improvement
- SKU demand insights
- Automation performance monitoring
- Workflow debugging dashboard

Goal:
Make the system improve with every run.

---

## 16. Claude Code Instructions

Claude Code should treat this file as the main project brief.

When helping build this system:

1. Start with a clean architecture.
2. Do not overbuild the first version.
3. Build in phases.
4. Use Supabase as the default backend unless a better reason exists.
5. Use n8n for workflows and integrations.
6. Keep AI recommendations explainable.
7. Use audit logs for anything important.
8. Keep all documents tied to order/client/payment records.
9. Use role-based access from the beginning.
10. Make every workflow debuggable.
11. Assume WhatsApp and email are the main communication channels.
12. Assume documents may be messy, scanned, forwarded, or incomplete.
13. Never trust AI extraction without confidence scoring and human review.
14. Make exports clean enough for accounting.
15. Keep the UI simple, operational, and fast.
16. Avoid unnecessary features that do not support MEC’s real process.
17. Build the platform so it can later support other Jarvis clients with similar operations.

---

## 17. Expected Final Outcome

MEC should end up with a single operating system where:

- Sales orders are captured properly
- Documents are automatically collected
- Orders are approved based on margin, stock, quantity, and risk
- Warehouse receives clear dispatch instructions
- Drivers update route and delivery status
- Clients receive order notifications
- Delivery notes are stored and authenticated
- Payment deadlines are tracked
- All records are exportable to Excel
- Client history is stored in CRM
- Supplier planning is supported by demand and inventory data
- Jarvis can monitor, improve, and debug the operation over time

This platform should make MEC’s daily operations more organized, faster, safer, and more scalable.
