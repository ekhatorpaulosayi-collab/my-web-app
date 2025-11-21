# STOREHOUSE WEB APP - COMPREHENSIVE TECHNICAL REPORT

**Report Generated:** 2025-11-11
**Version:** 2.0
**Project Status:** Active Development

---

## TABLE OF CONTENTS
1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture & Design Patterns](#3-architecture--design-patterns)
4. [Core Features](#4-core-features)
5. [Data Models & Schema](#5-data-models--schema)
6. [File Structure](#6-file-structure)
7. [Key Components](#7-key-components)
8. [User Flows & Journeys](#8-user-flows--journeys)
9. [State Management](#9-state-management)
10. [Authentication & Security](#10-authentication--security)
11. [Firebase Integration](#11-firebase-integration)
12. [Recent Development History](#12-recent-development-history)
13. [Known Issues & TODOs](#13-known-issues--todos)
14. [Development Setup](#14-development-setup)
15. [API Endpoints & Services](#15-api-endpoints--services)
16. [Styling & UI Patterns](#16-styling--ui-patterns)
17. [Testing & Quality](#17-testing--quality)
18. [Performance Optimizations](#18-performance-optimizations)
19. [Deployment & Build](#19-deployment--build)
20. [Future Roadmap](#20-future-roadmap)

---

## 1. PROJECT OVERVIEW

### 1.1 Purpose
**Storehouse** is a mobile-first inventory and point-of-sale (POS) web application designed for small to medium-sized Nigerian retailers. It enables shop owners to:
- Track inventory in real-time
- Record cash and credit sales
- Manage customer debts with installment plans
- Generate end-of-day (EOD) reports
- Accept online payments via Paystack
- Share an online store with customers via WhatsApp
- Import bulk items via CSV
- Monitor profit margins and tax obligations

### 1.2 Target Users
- Small shop owners in Nigeria
- Market traders
- Retail business owners
- Entrepreneurs managing inventory

### 1.3 Key Value Propositions
- **Offline-first:** Works without internet using IndexedDB
- **Nigerian context:** Naira currency (₦), Nigerian phone numbers, Paystack integration
- **Simple UX:** Mobile-optimized, quick actions, minimal clicks
- **Multi-platform:** Web app (PWA-ready)
- **Debt tracking:** Built-in credit sales with installment plans and WhatsApp reminders

---

## 2. TECHNOLOGY STACK

### 2.1 Frontend
- **Framework:** React 19.1.1
- **Build Tool:** Vite 7.1.7
- **Language:** JavaScript (JSX) + TypeScript (TSX) hybrid
- **Router:** React Router DOM 7.9.5
- **UI:** Custom CSS + inline styles (no UI framework)
- **Icons:** Lucide React 0.552.0

### 2.2 Backend & Services
- **Database:** Firebase Firestore (cloud)
- **Local Storage:** IndexedDB (offline support)
- **Authentication:** Firebase Auth
- **File Storage:** Firebase Storage
- **Payments:** Paystack API

### 2.3 Key Dependencies
```json
{
  "firebase": "^12.5.0",
  "react": "^19.1.1",
  "react-dom": "^19.1.1",
  "react-router-dom": "^7.9.5",
  "lucide-react": "^0.552.0",
  "papaparse": "^5.5.3",
  "uuid": "^13.0.0"
}
```

### 2.4 Development Tools
- **Linting:** ESLint 9.36.0
- **Dev Server:** Vite with HMR
- **TypeScript:** Mixed JS/TS codebase

---

## 3. ARCHITECTURE & DESIGN PATTERNS

### 3.1 Overall Architecture
```
┌─────────────────────────────────────┐
│         React App (SPA)             │
│  ┌───────────────────────────────┐  │
│  │   React Router (v7)           │  │
│  │   - Public routes (login)     │  │
│  │   - Protected routes (app)    │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │   Context Providers           │  │
│  │   - AuthContext               │  │
│  │   - BusinessProfile           │  │
│  │   - Preferences               │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌──────────┬──────────────────┐   │
│  │ IndexedDB│  Firebase        │   │
│  │ (offline)│  (cloud sync)    │   │
│  └──────────┴──────────────────┘   │
└─────────────────────────────────────┘
```

### 3.2 Design Patterns Used
1. **Context API Pattern:** Global state via React Context (Auth, Profile, Preferences)
2. **Compound Components:** Reusable UI components with sub-components
3. **Custom Hooks:** Logic reuse (useAuth, useBusinessProfile, useDirty)
4. **Error Boundaries:** Graceful error handling
5. **Protected Routes:** Authentication-based routing
6. **Optimistic UI:** Immediate feedback, background sync
7. **Service Layer:** Separation of data operations (services/)
8. **Repository Pattern:** Centralized data access (db/idb.js, services/firebaseProducts.js)

### 3.3 Folder Structure Philosophy
- **pages/:** Top-level route components
- **components/:** Reusable UI components
- **contexts/:** Global state providers
- **services/:** External API integrations
- **lib/:** Business logic and utilities
- **db/:** Database operations
- **utils/:** Pure helper functions
- **hooks/:** Custom React hooks
- **styles/:** Global and component styles

---

## 4. CORE FEATURES

### 4.1 Inventory Management
- ✅ Add, edit, delete items
- ✅ Track quantity, cost price, selling price
- ✅ Barcode support
- ✅ Low stock alerts (customizable thresholds)
- ✅ Category organization
- ✅ Bulk CSV import (PapaParse)
- ✅ Search by name or barcode
- ✅ Duplicate item prevention

### 4.2 Sales & POS
- ✅ Quick Sell (tap item to sell)
- ✅ Record Sale modal with multiple items
- ✅ Calculator integration
- ✅ Multiple payment methods (Cash, Transfer, POS, Paystack)
- ✅ Credit/Debt sales with installment plans
- ✅ Sales history & filtering
- ✅ Receipt generation & WhatsApp sharing
- ✅ End-of-Day (EOD) reports
- ✅ Daily sales totals

### 4.3 Credit & Debt Management
- ✅ Create debts with customer info
- ✅ Installment plans (weekly, bi-weekly, monthly, custom)
- ✅ Payment recording with balance tracking
- ✅ Overdue debt tracking
- ✅ WhatsApp payment reminders
- ✅ Customer debt history
- ✅ Status tracking (open, paid, overdue)
- ✅ Interest-free credit sales

### 4.4 Customer Management
- ✅ Customer profiles (name, phone, address)
- ✅ Case-insensitive customer search
- ✅ Debt consolidation per customer
- ✅ Payment history
- ✅ WhatsApp integration for reminders

### 4.5 Financial Features
- ✅ Profit tracking (selling price - cost price)
- ✅ Expense tracking (manual entry)
- ✅ Money page (profits, debts, expenses)
- ✅ Tax calculation & reports
- ✅ Payment method breakdown
- ✅ EOD summaries (readable & CSV formats)

### 4.6 Online Store
- ✅ Store profile setup (name, logo, address, WhatsApp)
- ✅ Custom store URL slug (slug validation)
- ✅ Store logo upload (Firebase Storage, 500x500px compression)
- ✅ WhatsApp store link sharing
- ✅ Public store visibility toggle

### 4.7 Settings & Configuration
- ✅ Business profile management
- ✅ Payment settings (Paystack integration)
- ✅ Security & PIN protection
- ✅ Account management
- ✅ Data export (CSV)
- ✅ Beta tester mode toggle

### 4.8 User Experience
- ✅ Dark mode toggle (via eye icon in dashboard)
- ✅ Mobile-first responsive design
- ✅ Keyboard shortcuts (C for calculator)
- ✅ Toast notifications
- ✅ Loading states & skeletons
- ✅ Error boundaries
- ✅ Offline support (IndexedDB)

---

## 5. DATA MODELS & SCHEMA

### 5.1 IndexedDB Schema (Local Storage)

#### **Store: `items`** (v3)
```javascript
{
  id: number,              // Auto-increment primary key
  name: string,            // Indexed (unique)
  sellKobo: number,        // Selling price in kobo
  costPrice: number,       // Cost price in Naira (legacy)
  qty: number,             // Current quantity
  category: string,        // Optional category
  barcode: string,         // Optional barcode
  lowStockThreshold: number, // Alert threshold
  createdAt: timestamp,
  isDeleted: boolean       // Soft delete flag
}
```

#### **Store: `sales`** (v5)
```javascript
{
  id: string,              // UUID
  itemId: number,          // FK to items
  itemName: string,        // Denormalized for receipts
  sellKobo: number,        // Sale price per unit (kobo)
  qty: number,             // Quantity sold
  timestamp: number,       // Sale date (ms)
  paymentMethod: string,   // "cash"|"transfer"|"pos"|"paystack"
  isCredit: boolean,       // True if credit sale
  customerName: string,    // Optional (for credit)
  dueDate: string,         // Optional (for credit)
  createdAt: timestamp     // Indexed
}
```

#### **Store: `customers`** (v4)
```javascript
{
  id: number,              // Auto-increment
  name: string,            // Indexed
  lowerName: string,       // Lowercase for case-insensitive search (v4)
  phone: string,           // Indexed, Nigerian format
  address: string,         // Optional
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### **Store: `credits`** (v2)
```javascript
{
  id: number,              // Auto-increment
  saleId: string,          // Indexed (unique), FK to sales
  customerId: number,      // Indexed, FK to customers
  totalAmount: number,     // Total debt in Naira
  balance: number,         // Remaining balance
  dueDate: string,         // ISO date
  status: string,          // "open"|"paid"|"overdue", indexed
  installmentPlan: {
    frequency: string,     // "weekly"|"bi-weekly"|"monthly"|"custom"
    amount: number,        // Amount per installment
    startDate: string,     // ISO date
    endDate: string        // ISO date (optional)
  },
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### **Store: `payments`** (v2)
```javascript
{
  id: number,              // Auto-increment
  creditId: number,        // Indexed, FK to credits
  amount: number,          // Payment amount in Naira
  method: string,          // "cash"|"transfer"|"pos"
  notes: string,           // Optional notes
  createdAt: timestamp     // Indexed
}
```

#### **Store: `settings`** (v1)
```javascript
{
  key: string,             // Primary key (e.g., "businessName")
  value: any               // JSON value
}
```

#### **Store: `outbox`** (v4)
```javascript
{
  id: string,              // Sale ID (for idempotency)
  kind: string,            // "sale"|"payment"|"item", indexed
  payload: object,         // Operation data
  createdAt: timestamp,    // Indexed
  synced: boolean          // Sync status
}
```

### 5.2 Firebase Firestore Schema

#### **Collection: `stores/{userId}`**
```javascript
{
  businessName: string,
  storeSlug: string,       // Unique URL slug
  logoUrl: string,         // Firebase Storage URL
  whatsappNumber: string,  // Nigerian format
  address: string,
  primaryColor: string,    // Hex color
  ownerId: string,         // User ID
  isPublic: boolean,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### **Collection: `stores/{userId}/items/{itemId}`**
```javascript
{
  name: string,
  sellKobo: number,
  costPrice: number,
  qty: number,
  category: string,
  barcode: string,
  lowStockThreshold: number,
  createdAt: Timestamp,
  isDeleted: boolean
}
```

#### **Collection: `slugs/{slug}`**
```javascript
{
  ownerId: string,         // User ID claiming this slug
  updatedAt: Timestamp
}
```

#### **Collection: `users/{userId}`**
```javascript
{
  email: string,
  displayName: string,
  photoURL: string,
  createdAt: Timestamp,
  lastLogin: Timestamp
}
```

### 5.3 TypeScript Interfaces

```typescript
// src/types/index.ts

export interface StoreProfile {
  businessName: string;
  storeSlug: string;
  logoUrl?: string;
  whatsappNumber: string;
  address?: string;
  primaryColor?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  ownerId: string;
  isPublic: boolean;
}

export interface SlugDocument {
  ownerId: string;
  updatedAt: Timestamp;
}

export interface DashboardPreferences {
  calmMode: boolean;
  collapsed: Record<string, boolean>;
  activeWidgets?: string[];
  businessType?: string;
}
```

---

## 6. FILE STRUCTURE

```
smartstock-v2/
├── public/
│   ├── template.csv                 # CSV import template
│   └── ...
├── src/
│   ├── assets/                      # Static assets
│   ├── components/                  # React components
│   │   ├── __tests__/               # Component tests
│   │   ├── common/                  # Shared components (ErrorBoundary, StatusPill)
│   │   ├── layout/                  # Layout components (StickyActions)
│   │   ├── settings/                # Settings sub-components
│   │   │   └── sections/            # Settings sections (PaymentsSection)
│   │   ├── ui/                      # UI primitives (Chip, CollapseCard)
│   │   ├── AfterSaleSheet.tsx       # Post-sale actions modal
│   │   ├── BusinessSettings.tsx     # Main settings modal
│   │   ├── CalculatorModal.tsx      # Calculator component
│   │   ├── CSVImport.tsx            # CSV/Excel import UI
│   │   ├── CreateDebtModal.tsx      # Create debt dialog
│   │   ├── CustomerDebtDrawer.tsx   # Customer debt sidebar
│   │   ├── Dashboard.tsx            # Main dashboard component
│   │   ├── DashboardCustomize.tsx   # Dashboard widget customization
│   │   ├── ErrorBoundary.tsx        # Error boundary wrapper
│   │   ├── ExpenseModal.tsx         # Expense entry modal
│   │   ├── MoreMenu.tsx             # "More" features menu
│   │   ├── RecordPaymentModal.tsx   # Record payment dialog
│   │   ├── RecordSaleModal.tsx      # Record sale modal
│   │   ├── ReceiptPreview.jsx       # Receipt preview & sharing
│   │   ├── ShareStoreBanner.tsx     # Online store promotion banner
│   │   ├── StoreSettings.tsx        # Online store configuration
│   │   └── ...
│   ├── contexts/                    # React contexts
│   │   ├── AuthContext.jsx          # Firebase auth provider
│   │   ├── BusinessProfile.jsx      # Business data provider
│   │   └── PreferencesContext.tsx   # User preferences provider
│   ├── db/                          # Database layer
│   │   └── idb.js                   # IndexedDB operations
│   ├── hooks/                       # Custom hooks
│   │   ├── useDirty.ts              # Form dirty state
│   │   └── useStrings.ts            # Localization hook
│   ├── lib/                         # Business logic
│   │   ├── authService.ts           # Auth operations
│   │   ├── expenses.ts              # Expense tracking
│   │   ├── firebase.js              # Firebase initialization
│   │   ├── pinService.ts            # PIN protection
│   │   ├── share.js                 # WhatsApp sharing
│   │   └── ...
│   ├── pages/                       # Route pages
│   │   ├── ExpensesPage.tsx         # Expenses list page
│   │   ├── ForgotPassword.jsx       # Password reset page
│   │   ├── Login.jsx                # Login page
│   │   ├── MoneyPage.jsx            # Financial overview page
│   │   ├── Settings.jsx             # Settings route wrapper
│   │   ├── Signup.jsx               # Signup page
│   │   └── TestPayment.jsx          # Paystack test page
│   ├── services/                    # External services
│   │   ├── dataMigration.js         # IndexedDB → Firebase migration
│   │   ├── firebaseProducts.js      # Product CRUD operations
│   │   └── ...
│   ├── state/                       # State management
│   │   ├── debts.ts                 # Debt management logic
│   │   └── settingsSchema.ts        # Settings validation
│   ├── styles/                      # CSS files
│   │   ├── dashboard.css            # Dashboard styles
│   │   ├── store-settings.css       # Store settings styles
│   │   ├── tokens.css               # Design tokens
│   │   └── ...
│   ├── types/                       # TypeScript types
│   │   └── index.ts                 # Shared type definitions
│   ├── utils/                       # Helper functions
│   │   ├── format.ts                # Number/currency formatting
│   │   ├── imageUpload.ts           # Image compression & upload
│   │   ├── money.ts                 # Money calculations
│   │   ├── settings.ts              # Settings persistence
│   │   ├── storeSlug.ts             # Slug generation/validation
│   │   ├── taxCalculations.ts       # Tax calculations
│   │   ├── whatsapp.ts              # WhatsApp link generation
│   │   └── ...
│   ├── App.jsx                      # Main app component
│   ├── AppRoutes.jsx                # Route configuration
│   ├── main.jsx                     # App entry point
│   └── index.css                    # Global styles
├── package.json                     # Dependencies
├── vite.config.js                   # Vite configuration
├── .env.example                     # Environment variables template
└── README.md                        # Project documentation
```

---

## 7. KEY COMPONENTS

### 7.1 App.jsx
**Purpose:** Main application shell containing the dashboard, modals, and global state
**Key Features:**
- 5000+ lines (monolithic component)
- Contains header, sidebar, dashboard, modals
- Manages global state (items, sales, debts, customers)
- Handles keyboard shortcuts
- Integrates all major features

**State Variables:**
- `items`, `sales`, `credits`, `customers`
- `showModal`, `showRecordSale`, `showSettings`, etc.
- `searchQuery`, `expandedItemId`
- `isPinLocked`, `showPinModal`

### 7.2 Dashboard.tsx
**Purpose:** Minimal dashboard view with key metrics and quick actions
**Features:**
- Today's sales total
- Quick Sell grid (top 6 items by quantity)
- Search items table
- More menu access
- Sales visibility toggle (eye icon)

### 7.3 RecordSaleModal.tsx
**Purpose:** Modal for recording sales with multiple items
**Features:**
- Multi-item selection
- Quantity adjustment
- Payment method selection
- Credit sale option
- Calculator integration
- Receipt generation

### 7.4 CreateDebtModal.tsx
**Purpose:** Create credit sales with installment plans
**Features:**
- Customer selection/creation
- Amount input with formatted display
- Installment plan builder (frequency, amount, dates)
- Due date picker
- Validation

### 7.5 RecordPaymentModal.tsx
**Purpose:** Record payments against existing debts
**Features:**
- Payment amount input
- Payment method selection
- Balance display
- Formatted currency display

### 7.6 CustomerDebtDrawer.tsx
**Purpose:** Sidebar showing customer debt details
**Features:**
- Customer info display
- Debt list with status
- Payment history
- WhatsApp reminder button
- Status filters (all, overdue, paid)

### 7.7 BusinessSettings.tsx
**Purpose:** Comprehensive settings modal with accordion sections
**Sections:**
1. Profile (business name, owner, phone)
2. Payments (Paystack configuration)
3. Online Store (logo, slug, WhatsApp)
4. Security & Privacy (PIN setup)
5. Account (logout, delete account)

### 7.8 StoreSettings.tsx
**Purpose:** Online store configuration sub-component
**Features:**
- Business name input
- WhatsApp number input
- Store address input
- Logo upload with preview (max 5MB, 500x500px compression)
- Custom URL slug with availability check (debounced)
- Copy store URL
- Share on WhatsApp

### 7.9 CSVImport.tsx
**Purpose:** Bulk item import from CSV/Excel files
**Features:**
- Template download link
- File upload (CSV, XLSX, XLS)
- PapaParse for parsing
- Flexible column mapping (supports multiple column names)
- Preview table (first 10 items)
- Batch import to Firestore

### 7.10 MoreMenu.tsx
**Purpose:** Grid menu showing additional features
**Items:**
- Online Store
- Full Inventory
- Low Stock Alerts
- Money & Credit
- Sales History
- Debt/Credit Sales
- Expenses
- Settings

---

## 8. USER FLOWS & JOURNEYS

### 8.1 New User Onboarding
1. User visits app → Redirected to `/login`
2. Clicks "Sign Up" → `/signup`
3. Enters email, password → Firebase Auth creates account
4. Redirected to `/` (dashboard)
5. Sees first-time setup banner
6. Clicks "Complete Setup" → Settings opens
7. Fills business profile → Saved to localStorage & Firestore
8. Setup complete → Dashboard ready

### 8.2 Recording a Cash Sale
1. User clicks item in Quick Sell OR searches and clicks item
2. RecordSaleModal opens with item pre-selected
3. User adjusts quantity (optional)
4. Selects payment method (default: Cash)
5. Clicks "Record Sale"
6. Sale saved to IndexedDB
7. Inventory quantity decremented
8. Receipt preview shown (optional)
9. User can share receipt via WhatsApp

### 8.3 Creating a Credit Sale with Installments
1. User clicks "Record Sale"
2. Adds items to cart
3. Selects "Credit Sale" tab
4. Enters customer name (searches existing or creates new)
5. Sets total credit amount
6. Clicks "Set Installment Plan"
7. Selects frequency (weekly, bi-weekly, monthly, custom)
8. Enters installment amount
9. Sets start date
10. System calculates payment schedule
11. Clicks "Create Debt"
12. Debt saved to IndexedDB (customers, credits stores)
13. Sale recorded with `isCredit: true`

### 8.4 Recording a Payment Against Debt
1. User opens "Debt/Credit Sales" from More menu
2. CustomerDebtDrawer opens showing all customers with debts
3. Clicks on customer
4. Clicks "Record Payment" on specific debt
5. RecordPaymentModal opens
6. Enters payment amount (formatted as ₦200,000)
7. Selects payment method
8. Clicks "Record Payment"
9. Payment saved to IndexedDB (payments store)
10. Credit balance updated
11. If balance = 0, status → "paid"

### 8.5 Setting Up Online Store
1. User opens Settings (gear icon or More → Settings)
2. Navigates to `/settings`
3. Expands "Online Store" section
4. Enters business name
5. Enters WhatsApp number (Nigerian format)
6. Enters store address
7. Uploads logo (image compressed to 500x500px)
8. Enters custom store URL slug (e.g., "paul-store")
9. System checks slug availability (debounced, 500ms)
10. If available, shows green checkmark
11. Clicks "Save Settings"
12. Firestore transaction:
    - Claims slug in `/slugs/{slug}`
    - Saves store profile in `/stores/{userId}`
13. Success message shown
14. User can copy store URL or share on WhatsApp

### 8.6 Importing Items from CSV
1. User clicks "📥 Import" button (next to search bar on dashboard)
2. CSVImport modal opens
3. User downloads template CSV
4. Opens template in Excel, fills item data
5. Saves as CSV
6. Uploads file via file input
7. PapaParse parses CSV
8. Preview table shows first 10 items
9. User reviews data
10. Clicks "Import All X Items"
11. Batch write to Firestore (`/stores/{userId}/items/{itemId}`)
12. Success: "✓ X items imported successfully!"
13. Items appear in inventory immediately

### 8.7 Generating End-of-Day Report
1. User opens Settings → Data Management
2. Clicks "Send EOD Report"
3. Selects format:
   - Readable (formatted text)
   - CSV (spreadsheet)
4. System calculates:
   - Total sales by payment method
   - Total profit
   - New debts created
   - Payments received
   - Expenses recorded
5. Generates report text/CSV
6. Opens WhatsApp with pre-filled message
7. User sends to self or manager

---

## 9. STATE MANAGEMENT

### 9.1 Context Providers

#### **AuthContext** (`src/contexts/AuthContext.jsx`)
```javascript
{
  currentUser: User | null,
  userProfile: UserProfile | null,
  loading: boolean,
  login: (email, password) => Promise,
  signup: (email, password) => Promise,
  logout: () => Promise,
  resetPassword: (email) => Promise
}
```

#### **BusinessProfile** (`src/contexts/BusinessProfile.jsx`)
```javascript
{
  profile: {
    businessName: string,
    ownerName: string,
    phoneNumber: string,
    address: string
  },
  setProfile: (profile) => void,
  isProfileComplete: boolean
}
```

#### **PreferencesContext** (`src/contexts/PreferencesContext.tsx`)
```javascript
{
  preferences: DashboardPreferences,
  updatePreferences: (prefs) => void,
  isFirstTimeSetup: boolean,
  completeSetup: () => void
}
```

### 9.2 Local State (App.jsx)
- **Items:** Loaded from IndexedDB on mount, synced with Firebase
- **Sales:** Persisted to IndexedDB after each sale
- **Debts:** Managed via `src/state/debts.ts` module
- **Customers:** CRUD via IndexedDB
- **Settings:** Saved to localStorage + Firestore

### 9.3 State Persistence
- **IndexedDB:** Primary storage for offline-first data
- **localStorage:** Settings, preferences, flags
- **Firebase Firestore:** Cloud backup and sync
- **Session Storage:** Temporary UI state

---

## 10. AUTHENTICATION & SECURITY

### 10.1 Firebase Authentication
- **Provider:** Firebase Auth with email/password
- **Protected Routes:** All routes except `/login`, `/signup`, `/forgot-password`
- **ProtectedRoute Component:** Redirects unauthenticated users to `/login`

### 10.2 PIN Protection
- **Purpose:** Optional secondary security for Money page
- **Implementation:**
  - PIN stored hashed in localStorage (NOT secure, placeholder)
  - `hasPinSet()`, `verifyPin()`, `setPin()`, `clearPin()` in `lib/pinService.ts`
  - PIN modal blocks access to Money page until verified
  - "Remember PIN" option (session-based)

### 10.3 Security Considerations
⚠️ **Current Issues:**
- PIN stored in localStorage (client-side, insecure)
- No server-side validation for critical operations
- Firebase rules should be manually configured (not in codebase)

**Recommended Firestore Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Store profiles
    match /stores/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;

      // Items subcollection
      match /items/{itemId} {
        allow read: if request.auth != null;
        allow write: if request.auth.uid == userId;
      }
    }

    // Slug ownership
    match /slugs/{slug} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == resource.data.ownerId;
    }

    // User profiles
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

**Recommended Storage Rules:**
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /store-logos/{userId}/{filename} {
      allow read: if true;
      allow write: if request.auth.uid == userId
                  && request.resource.size < 5 * 1024 * 1024
                  && request.resource.contentType.matches('image/.*');
    }
  }
}
```

---

## 11. FIREBASE INTEGRATION

### 11.1 Configuration
- **File:** `src/lib/firebase.js`
- **Environment Variables:**
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`

### 11.2 Services Used
1. **Firebase Auth:** User authentication
2. **Firestore:** Cloud database
3. **Firebase Storage:** File uploads (store logos)

### 11.3 Key Operations

#### **Products Service** (`src/services/firebaseProducts.js`)
- `getProducts(userId)` → Fetch all items
- `addProduct(userId, product)` → Create item
- `updateProduct(userId, productId, updates)` → Update item
- `deleteProduct(userId, productId)` → Soft delete item
- `productExists(userId, name)` → Check duplicate
- `subscribeToProducts(userId, callback)` → Real-time listener

#### **Image Upload** (`src/utils/imageUpload.ts`)
- `compressImage(file)` → Resize to max 500x500px, 80% JPEG quality
- `uploadStoreLogo(file, userId, oldUrl)` → Upload to Storage, delete old logo

#### **Slug Management** (`src/utils/storeSlug.ts`)
- `generateStoreSlug(businessName)` → Create URL-safe slug
- `checkSlugChange(oldSlug, newSlug)` → Detect changes
- `saveStoreSlug(userId, slug)` → Atomic transaction to claim slug

### 11.4 Data Migration
- **File:** `src/services/dataMigration.js`
- **Purpose:** One-time migration from IndexedDB to Firebase
- **Trigger:** Manual (not automatic)
- **Process:**
  1. Read all items from IndexedDB
  2. Batch write to Firestore
  3. Mark migration complete in localStorage

---

## 12. RECENT DEVELOPMENT HISTORY

### 12.1 Phase 1 & 2: Debt/Credit Sales (Completed)
- ✅ Customer management (create, search, case-insensitive)
- ✅ Debt creation with installment plans
- ✅ Payment recording with balance tracking
- ✅ Status tracking (open, paid, overdue)
- ✅ WhatsApp payment reminders
- ✅ Fixed modal z-index issues (modals appearing behind drawers)
- ✅ Added formatted number display (₦200,000 instead of 200000)
- ✅ Made footer buttons sticky in modals

### 12.2 Firebase Store Settings (Completed)
- ✅ Firebase Storage setup for logo uploads
- ✅ Image compression (500x500px, 80% JPEG)
- ✅ StoreSettings component with slug validation
- ✅ Slug availability check (debounced, 500ms)
- ✅ Atomic Firestore transactions for slug claiming
- ✅ Integrated into BusinessSettings as Section 3
- ✅ Created CSS styling
- ✅ Provided Firebase security rules (manual setup required)

### 12.3 UI/UX Improvements (Completed)
- ✅ Renamed "Reports" to "Sales History" in MoreMenu
- ✅ Fixed "Full Inventory" button (was non-functional)
- ✅ Added "📥 Import CSV" button to Dashboard
- ✅ Fixed `isDirty is not defined` error in BusinessSettings

### 12.4 CSV Import Feature (Completed)
- ✅ Created CSVImport component
- ✅ Installed papaparse for CSV parsing
- ✅ Created template.csv with sample Nigerian products
- ✅ Fixed import paths (config/firebase → lib/firebase)
- ✅ Added useAuth hook for user authentication
- ✅ Integrated into Dashboard (import button next to search bar)

### 12.5 Unified Settings Route (Just Completed)
- ✅ Created `/settings` canonical route
- ✅ Settings page wraps BusinessSettings in ErrorBoundary + Suspense
- ✅ Header gear icon navigates to `/settings`
- ✅ More menu Settings navigates to `/settings`
- ✅ Added redirects for legacy routes:
  - `/store-settings` → `/settings`
  - `/config` → `/settings`
  - `/preferences` → `/settings`
  - `/business-settings` → `/settings`
  - `/account` → `/settings`
  - `/profile` → `/settings`
- ✅ Enhanced ErrorBoundary with reload button
- ✅ Fixed black/blank page issue

---

## 13. KNOWN ISSUES & TODOs

### 13.1 Critical Issues
- ⚠️ **PIN Security:** PIN stored in localStorage (plaintext equivalent) - needs server-side hashing
- ⚠️ **Firebase Rules:** Security rules not enforced (manual setup required)
- ⚠️ **No Server Validation:** All business logic client-side, vulnerable to tampering
- ⚠️ **CSV Import No Validation:** No server-side duplicate checks during bulk import

### 13.2 Medium Priority
- 🔄 **Offline Sync Queue:** Outbox store exists but not fully implemented
- 🔄 **Real-time Sync:** Firebase listeners not enabled for all collections
- 🔄 **Image Optimization:** Logo uploads not optimized for different screen sizes (no responsive images)
- 🔄 **Barcode Scanner:** No camera integration for barcode scanning
- 🔄 **Print Receipts:** No printer integration (only WhatsApp sharing)

### 13.3 Low Priority / Nice-to-Have
- 📝 **Dashboard Widget Reordering:** DashboardCustomize exists but limited
- 📝 **Multi-currency Support:** Currently Naira only
- 📝 **Inventory Transfers:** No support for moving stock between locations
- 📝 **Bulk Edit:** No multi-select for batch operations
- 📝 **Advanced Search:** No fuzzy search or filters
- 📝 **Notifications:** No push notifications (PWA feature)
- 📝 **Analytics Dashboard:** Basic metrics only, no charts/graphs

### 13.4 Tech Debt
- 🏗️ **App.jsx Size:** 5000+ lines, needs refactoring into smaller components
- 🏗️ **Mixed JS/TS:** Inconsistent language use (some files .jsx, some .tsx)
- 🏗️ **No Unit Tests:** Only one test file found (`CurrentDate.test.tsx`)
- 🏗️ **No E2E Tests:** No integration or end-to-end testing
- 🏗️ **CSS Organization:** Mix of CSS files, inline styles, no design system
- 🏗️ **No Storybook:** UI components not documented
- 🏗️ **Bundle Size:** No code splitting, entire app loaded upfront

---

## 14. DEVELOPMENT SETUP

### 14.1 Prerequisites
- Node.js 18+ (recommended: 20+)
- npm or yarn
- Firebase project (Firestore, Auth, Storage enabled)

### 14.2 Installation
```bash
# Clone repository
git clone <repo-url>
cd smartstock-v2

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Add Firebase config to .env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 14.3 Run Development Server
```bash
npm run dev
# Vite dev server starts at http://localhost:4000
```

### 14.4 Build for Production
```bash
npm run build
# Output: dist/ folder
```

### 14.5 Preview Production Build
```bash
npm run preview
```

### 14.6 Linting
```bash
npm run lint
```

---

## 15. API ENDPOINTS & SERVICES

### 15.1 Firebase Endpoints
All Firebase operations go through SDK, no direct REST calls.

**Firestore Collections:**
- `/stores/{userId}` - Store profiles
- `/stores/{userId}/items/{itemId}` - Items
- `/slugs/{slug}` - Slug ownership
- `/users/{userId}` - User profiles

**Storage Paths:**
- `/store-logos/{userId}/{filename}` - Store logo images

### 15.2 External APIs

#### **Paystack API** (Payments)
- **Base URL:** `https://api.paystack.co`
- **Endpoints Used:**
  - `POST /transaction/initialize` - Create payment link
  - `GET /transaction/verify/:reference` - Verify payment
- **Authentication:** Bearer token (Paystack secret key)
- **Configuration:** `src/components/PaymentSettings.tsx`

#### **WhatsApp Business API** (Messaging)
- **URL Format:** `https://wa.me/{phone}?text={message}`
- **Usage:**
  - Share receipts
  - Send payment reminders
  - Share store link
- **Implementation:** `src/utils/whatsapp.ts`, `src/lib/share.js`

---

## 16. STYLING & UI PATTERNS

### 16.1 Styling Approach
- **Primary:** CSS Modules (`.css` files imported in components)
- **Secondary:** Inline styles (for dynamic values)
- **No Framework:** No Tailwind, Bootstrap, Material-UI

### 16.2 CSS Files
- `src/index.css` - Global resets, base styles
- `src/styles/tokens.css` - Design tokens (colors, spacing)
- `src/styles/dashboard.css` - Dashboard-specific styles
- `src/styles/store-settings.css` - Store settings styles
- `src/components/MoreMenu.css` - More menu styles

### 16.3 Design Tokens (Partial List)
```css
/* Colors */
--primary: #667eea;
--secondary: #764ba2;
--success: #10b981;
--error: #ef4444;
--warning: #f59e0b;

/* Spacing */
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;

/* Typography */
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
--font-mono: "SF Mono", Monaco, monospace;
```

### 16.4 Responsive Design
- **Mobile-first:** Optimized for 375px-768px screens
- **Breakpoints:**
  - Mobile: < 768px
  - Desktop: >= 768px
- **Techniques:**
  - Flexbox layouts
  - Media queries
  - `vh` units for full-height sections

### 16.5 Accessibility
- ⚠️ **Limited Implementation:**
  - Some ARIA labels present
  - Keyboard navigation partially supported
  - No focus indicators on most elements
  - No screen reader testing
- 🔄 **Needs Improvement:**
  - Color contrast (some text on colored backgrounds)
  - Form validation messages
  - Modal focus trapping

---

## 17. TESTING & QUALITY

### 17.1 Current State
- ❌ **No comprehensive test suite**
- ✅ **One test file:** `src/components/__tests__/CurrentDate.test.tsx`
- ❌ **No E2E tests**
- ❌ **No CI/CD pipeline**

### 17.2 Manual Testing Checklist
- [ ] User registration & login
- [ ] Add/edit/delete items
- [ ] Record cash sale
- [ ] Record credit sale with installment plan
- [ ] Record payment against debt
- [ ] CSV import (10+ items)
- [ ] Upload store logo
- [ ] Set custom store URL slug
- [ ] Generate EOD report
- [ ] Share receipt via WhatsApp
- [ ] Settings persistence
- [ ] Offline mode (disconnect internet, perform actions)

---

## 18. PERFORMANCE OPTIMIZATIONS

### 18.1 Implemented
- ✅ **Vite HMR:** Fast hot module reloading during development
- ✅ **IndexedDB:** Offline-first data storage
- ✅ **Image Compression:** Logos resized to 500x500px @ 80% quality
- ✅ **Debounced Slug Check:** 500ms delay for slug availability API calls
- ✅ **Lazy State Updates:** React state batching

### 18.2 Missing
- ❌ **Code Splitting:** No dynamic imports, entire app loaded upfront
- ❌ **Service Worker:** No PWA caching strategy
- ❌ **Virtual Scrolling:** Large lists (100+ items) render all at once
- ❌ **Memoization:** No React.memo, useMemo, useCallback in heavy components
- ❌ **Bundle Analysis:** No bundle size monitoring

---

## 19. DEPLOYMENT & BUILD

### 19.1 Build Configuration
- **Tool:** Vite 7.1.7
- **Output:** `dist/` folder
- **Command:** `npm run build`

### 19.2 Environment Variables
Required for production:
```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### 19.3 Deployment Targets
**Recommended:**
- **Vercel:** Zero-config deployment
- **Netlify:** Simple static hosting
- **Firebase Hosting:** Integrated with Firebase services

**Steps (Vercel Example):**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### 19.4 Pre-deployment Checklist
- [ ] Set all Firebase env variables
- [ ] Configure Firebase security rules (Firestore + Storage)
- [ ] Test build locally: `npm run build && npm run preview`
- [ ] Verify all features work in production build
- [ ] Set up custom domain (optional)
- [ ] Configure Paystack webhook URL (if using payments)

---

## 20. FUTURE ROADMAP

### 20.1 Short-term (Next Sprint)
1. **Unit Tests:** Add tests for critical functions (money.ts, debts.ts)
2. **Refactor App.jsx:** Split into smaller components (Header, Sidebar, Modals)
3. **Error Handling:** Add try-catch blocks to all Firebase operations
4. **Loading States:** Consistent spinners across all async operations
5. **Toast System:** Standardized success/error notifications

### 20.2 Medium-term (1-3 Months)
1. **PWA:** Add service worker for offline support
2. **Real-time Sync:** Enable Firebase listeners for multi-device sync
3. **Barcode Scanner:** Integrate camera API for barcode scanning
4. **Inventory Alerts:** Push notifications for low stock
5. **Advanced Reports:** Charts (Chart.js or Recharts), profit trends
6. **Multi-user:** Allow staff accounts with roles (owner, cashier)

### 20.3 Long-term (3-6 Months)
1. **Mobile Apps:** React Native wrappers for iOS/Android
2. **Receipt Printer:** USB/Bluetooth printer integration
3. **Multi-location:** Support for multiple store branches
4. **Accounting Integration:** QuickBooks, Xero exports
5. **AI Insights:** Predictive analytics for reordering
6. **Subscription Model:** Premium features (unlimited items, advanced reports)

---

## APPENDIX A: COMMON COMMANDS

```bash
# Development
npm run dev                # Start dev server
npm run build              # Build for production
npm run preview            # Preview production build
npm run lint               # Run ESLint

# Firebase (Manual Setup)
firebase login
firebase init firestore    # Set up Firestore
firebase init storage      # Set up Storage
firebase deploy --only firestore:rules
firebase deploy --only storage

# Git
git status
git add .
git commit -m "feat: description"
git push origin main

# Dependencies
npm install <package>
npm update
npm audit fix
```

---

## APPENDIX B: KEY FILES QUICK REFERENCE

| File | Purpose | Lines |
|------|---------|-------|
| `src/App.jsx` | Main app component | 5000+ |
| `src/AppRoutes.jsx` | Route configuration | 106 |
| `src/main.jsx` | Entry point | 30 |
| `src/db/idb.js` | IndexedDB operations | 1500+ |
| `src/lib/firebase.js` | Firebase initialization | 30 |
| `src/contexts/AuthContext.jsx` | Auth provider | 200+ |
| `src/components/Dashboard.tsx` | Dashboard view | 400+ |
| `src/components/RecordSaleModal.tsx` | Sale recording | 800+ |
| `src/components/CreateDebtModal.tsx` | Debt creation | 500+ |
| `src/components/BusinessSettings.tsx` | Settings modal | 700+ |
| `src/components/StoreSettings.tsx` | Store configuration | 300+ |
| `src/components/CSVImport.tsx` | CSV import | 220+ |
| `src/utils/imageUpload.ts` | Image upload | 100+ |
| `src/services/firebaseProducts.js` | Product CRUD | 200+ |
| `src/state/debts.ts` | Debt management | 300+ |

---

## APPENDIX C: DEBUGGING TIPS

### C.1 Common Errors

**"Firebase not initialized"**
```javascript
// Check: src/lib/firebase.js
// Ensure all VITE_FIREBASE_* env vars are set
console.log(import.meta.env.VITE_FIREBASE_PROJECT_ID);
```

**"IndexedDB version error"**
```javascript
// Solution: Clear IndexedDB in DevTools
// Application tab → Storage → IndexedDB → Delete "storehouse"
// Refresh page
```

**"Slug already taken"**
```javascript
// Check Firestore: /slugs/{slug}
// Manually delete if needed
// Or choose different slug
```

**"Image upload failed"**
```javascript
// Check:
// 1. File size < 5MB
// 2. Firebase Storage rules configured
// 3. User authenticated
```

### C.2 DevTools Tips
- **React DevTools:** Install to inspect component state
- **Network Tab:** Monitor Firebase requests (filter by "firestore.googleapis.com")
- **Console:** All Firebase operations logged in DEV mode
- **Application Tab:** Check IndexedDB, localStorage, sessionStorage

---

## APPENDIX D: CONTACT & SUPPORT

- **Repository:** (Add GitHub URL)
- **Issues:** (Add GitHub Issues URL)
- **Documentation:** This file + inline code comments
- **Support:** (Add email or Slack channel)

---

**END OF REPORT**

This comprehensive report should provide a large language model (or human developer) with all necessary context to understand, analyze, and continue building the Storehouse web application. Update this document as the project evolves.
