# 🏥 Care Agency Web App - Core Features & Business Plan

## 🎯 Target Market: UK Care Agencies

Care agencies in the UK manage home care services, staff scheduling, compliance, and client care. They face strict regulations (CQC) and need reliable software.

---

## 💎 5 Core Features (Must-Haves)

### 1. **Staff Scheduling & Rota Management** ⭐⭐⭐⭐⭐
**Why Critical:** 80% of care agency operations is scheduling carers to clients

**Features:**
- Drag-and-drop rota builder
- Auto-assign carers based on:
  - Skills/certifications
  - Availability
  - Location (proximity to client)
  - Continuity of care (same carer preference)
- Shift clash detection
- Mobile app for carers to:
  - View shifts
  - Clock in/out with GPS
  - Accept/decline shifts
- Real-time notifications for changes
- Export to payroll

**UK-Specific:**
- Support for 15-min, 30-min, 1-hour, 2-hour visits
- Night shift support (sleepover vs waking nights)
- Bank holiday pay calculations

**Revenue Impact:** Agencies pay £50-200/month for this alone

---

### 2. **Client Care Plans & Digital Care Records** ⭐⭐⭐⭐⭐
**Why Critical:** CQC (Care Quality Commission) requires detailed care documentation

**Features:**
- Digital care plans (replacing paper)
- Care tasks checklist:
  - Personal care
  - Medication administration (MAR charts)
  - Meal preparation
  - Observations (BP, temperature, mood)
- Photo upload (pressure sores, meals, etc.)
- Family portal (relatives can view updates)
- Incident reporting
- Signature capture (carer + client/family)
- Offline mode (sync when back online)

**UK-Specific:**
- CQC-compliant templates
- GDPR-compliant data handling
- NHS number integration
- Integration with local authority systems

**Revenue Impact:** Agencies pay £100-300/month for compliance tools

---

### 3. **Compliance & Training Management** ⭐⭐⭐⭐
**Why Critical:** CQC inspections can shut down agencies; staff must have valid certifications

**Features:**
- Staff document storage:
  - DBS (criminal background check) - expiry alerts
  - Care Certificate
  - First Aid
  - Moving & Handling
  - Medication training
  - Food Hygiene
- Auto-alerts for expiring documents (30/60/90 days)
- Training tracking
- CQC inspection report generator
- Policy library (safeguarding, infection control, etc.)
- Supervision & appraisal tracking

**UK-Specific:**
- DBS update service integration
- Skills for Care framework alignment
- CQC Key Lines of Enquiry (KLOE) reports

**Revenue Impact:** Prevents fines, saves agencies £1000s in CQC penalties

---

### 4. **Invoicing & Billing Automation** ⭐⭐⭐⭐
**Why Critical:** Care agencies bill clients, local councils, and CCGs (Clinical Commissioning Groups)

**Features:**
- Auto-generate invoices from completed visits
- Multiple billing rates:
  - Private pay clients
  - Local authority (council) funded
  - NHS Continuing Healthcare (CHC)
  - Direct payments
- Split billing (client pays part, council pays part)
- Payment tracking
- Export to accounting software (Xero, QuickBooks, Sage)
- Arrears alerts

**UK-Specific:**
- Local authority rate cards
- NHS CHC billing codes
- Support for 15-min billing increments
- Mileage claims for rural areas

**Revenue Impact:** Agencies save 10-20 hours/week on invoicing

---

### 5. **Client & Referral Management (CRM)** ⭐⭐⭐
**Why Critical:** Agencies need to manage inquiries, assessments, and onboarding

**Features:**
- Lead tracking (referrals from hospitals, social services, self-referrals)
- Initial assessment forms
- Care package builder (hours per week, tasks)
- Capacity planning (do we have staff available?)
- Client onboarding workflow
- Contract management
- Review scheduling (3-month, 6-month care reviews)

**UK-Specific:**
- Local authority referral forms
- NHS discharge templates
- Deprivation of Liberty Safeguards (DoLS) tracking

**Revenue Impact:** Faster onboarding = faster revenue

---

## 🏆 Bonus Features (Nice-to-Haves for Premium Tier)

### 6. **Mobile App for Carers**
- View rota
- Clock in/out with GPS
- Complete care notes on-the-go
- Offline mode
- Push notifications

### 7. **Analytics & Reporting**
- Occupancy rates (% of available hours filled)
- Staff utilization
- Revenue per client
- CQC performance metrics
- Predictive staffing needs

### 8. **Family Portal**
- View care notes in real-time
- Message carers/office
- View invoices
- Update preferences

---

## 💰 Pricing Strategy for UK Market

### Tier 1: Starter (1-20 clients)
**£99/month**
- Staff scheduling
- Basic care notes
- Document storage
- Up to 5 users

### Tier 2: Professional (21-100 clients)
**£249/month**
- Everything in Starter
- Invoicing automation
- Family portal
- CQC reports
- Up to 20 users

### Tier 3: Enterprise (100+ clients)
**£499/month**
- Everything in Professional
- API access
- Dedicated support
- Custom integrations
- Unlimited users

### Add-ons:
- Mobile app: £49/month
- Advanced analytics: £99/month
- Onboarding & training: £499 one-time

**Annual billing discount: 2 months free (17% off)**

---

## 🎯 Target Customers

### Primary:
- Small to medium care agencies (10-100 clients)
- Owner-operated businesses
- Agencies transitioning from paper/Excel

### Secondary:
- Larger agencies (100-500 clients) looking to replace expensive legacy systems
- New startups needing all-in-one solution

---

## 🇬🇧 UK Market Opportunity

**Market Size:**
- 18,000+ registered care agencies in UK
- 40% still use paper or basic Excel
- Average agency pays £200-500/month for software

**Your Advantage:**
- Modern, mobile-first design
- Affordable pricing (competitors charge £300-800/month)
- Built by someone who understands operations (you have tech + business insight)

**Revenue Potential:**
- 50 agencies at £249/month = £12,450/month (£149k/year)
- 100 agencies at £249/month = £24,900/month (£299k/year)

---

## 🚀 Go-to-Market Strategy

### Phase 1: MVP (3 months)
Build core features 1-3:
- Scheduling
- Care notes
- Compliance tracking

### Phase 2: Beta Testing (2 months)
- Find 5-10 agencies to use for free
- Gather feedback
- Refine features

### Phase 3: Launch (Month 6)
- Paid tier launch
- Target: 10 paying customers in first 3 months

### Marketing Channels:
1. **LinkedIn** - Connect with care agency owners
2. **Care industry forums** - Care Talk, Skills for Care community
3. **Local authority events** - Network with commissioners
4. **Google Ads** - "care agency software UK"
5. **Partnerships** - DBS providers, training companies
6. **Content marketing** - "How to pass CQC inspection" guides

---

## 🛠️ Tech Stack (Recommended)

**Frontend:**
- React (what you already know)
- Mobile: React Native

**Backend:**
- Supabase (auth, database, storage) - same as Storehouse
- PostgreSQL with Row Level Security

**Key Differences from Storehouse:**
- More complex scheduling logic
- Offline-first mobile app
- Document storage (DBS, certificates)
- GPS tracking for clock in/out
- Digital signatures

---

## ⚖️ Legal & Compliance (UK)

You MUST ensure:
1. **GDPR compliance** - Data processing agreement template
2. **ICO registration** - £40/year Data Protection fee
3. **CQC alignment** - Software doesn't need CQC approval, but must support their requirements
4. **NHS Data Security & Protection Toolkit** - If integrating with NHS systems
5. **Cyber Essentials certification** - £300, shows you're secure

---

## 🎯 Your Next Steps

If you want to build this:

1. **Validate the market:**
   - Call 10-20 care agencies
   - Ask: "What's your biggest pain point with scheduling/documentation?"
   - Show mockups, gauge interest

2. **Build MVP:**
   - Start with scheduling (biggest pain point)
   - Add care notes
   - Basic compliance tracking

3. **Get first customer:**
   - Offer 50% discount for first year
   - Use them as case study

4. **Iterate based on feedback**

---

## 💡 Why This Can Work for You

**Your Advantages:**
1. You already built Storehouse (inventory management) - similar complexity
2. You understand Supabase, React, authentication
3. You know how to deploy to production
4. Care agencies desperately need modern, affordable software
5. Competitors are old, clunky, expensive

**Realistic Timeline:**
- MVP: 3-4 months (nights/weekends)
- First paying customer: Month 5
- 10 customers: Month 9
- Quit day job: £3k-5k/month revenue (12-20 customers)

---

## 📞 Want to Discuss Further?

I can help you:
- Design the database schema
- Build the scheduling algorithm
- Create the authentication system (you already have this from Storehouse!)
- Plan the features step-by-step

**This is a real opportunity.** Care agencies need this, and you have the skills to build it.

Interested? 🚀
