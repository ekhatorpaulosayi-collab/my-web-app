import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import App from './App.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import AuthConfirm from './pages/AuthConfirm.jsx';
import UpdatePassword from './pages/UpdatePassword.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

// Lazy load non-critical routes for better performance
const Settings = lazy(() => import('./pages/Settings.jsx'));
const CustomersPage = lazy(() => import('./pages/CustomersPage.tsx'));
const StaffManagement = lazy(() => import('./pages/StaffManagement.tsx'));
const ReferralDashboard = lazy(() => import('./pages/ReferralDashboard.tsx'));
const Invoices = lazy(() => import('./pages/Invoices.tsx'));
const CreateInvoice = lazy(() => import('./pages/CreateInvoice.tsx'));
const InvoiceDetail = lazy(() => import('./pages/InvoiceDetail.tsx'));
const PublicInvoiceView = lazy(() => import('./pages/PublicInvoiceView.tsx'));
const ReviewManagement = lazy(() => import('./pages/ReviewManagement.tsx'));
const StorefrontPage = lazy(() => import('./pages/StorefrontPage.tsx'));
const ImageTest = lazy(() => import('./pages/ImageTest.tsx'));
const DirectImageTest = lazy(() => import('./pages/DirectImageTest.tsx'));
const AllVariantsTest = lazy(() => import('./pages/AllVariantsTest.tsx'));
const TestVariants = lazy(() => import('./pages/TestVariants.tsx'));
const DevSaleModal = lazy(() => import('./pages/DevSaleModal.tsx'));
const StoreSetup = lazy(() => import('./components/StoreSetup.tsx'));
const StoreQuickSetup = lazy(() => import('./components/StoreQuickSetup.tsx'));
const StoreSetupComplete = lazy(() => import('./components/StoreSetupComplete.tsx'));
const OnlineStoreSetup = lazy(() => import('./components/OnlineStoreSetup.tsx'));
const ErrorMonitoringDashboard = lazy(() => import('./pages/ErrorMonitoringDashboard.tsx'));
const WhatsAppAI = lazy(() => import('./pages/WhatsAppAI.tsx'));
const HelpCenter = lazy(() => import('./pages/HelpCenter.tsx'));
const LandingPage = lazy(() => import('./pages/LandingPage.tsx'));
const SubmitTestimonial = lazy(() => import('./pages/SubmitTestimonial.tsx'));

/**
 * App Routes
 * Handles routing between login, signup, and protected dashboard
 */
export default function AppRoutes() {
  const { currentUser, loading } = useAuth();

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e5e7eb',
            borderTopColor: '#667eea',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
            Loading your store...
          </p>
        </div>
      </div>
    );
  }

  // Loading component to reuse
  const LoadingScreen = () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#F6F6F7'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '32px',
        textAlign: 'center',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.06)'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid #E5E7EB',
          borderTopColor: '#00894F',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 12px'
        }}></div>
        <p style={{ margin: 0, color: '#6B7280', fontSize: '14px' }}>
          Loading...
        </p>
      </div>
    </div>
  );

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Public routes - Don't redirect while loading to prevent flash */}
        <Route
          path="/login"
          element={
            loading ? <LoadingScreen /> : currentUser ? <Navigate to="/" replace /> : <Login />
          }
        />
        <Route
          path="/signup"
          element={
            loading ? <LoadingScreen /> : currentUser ? <Navigate to="/" replace /> : <Signup />
          }
        />
        <Route
          path="/forgot-password"
          element={
            loading ? <LoadingScreen /> : currentUser ? <Navigate to="/" replace /> : <ForgotPassword />
          }
        />
        <Route
          path="/auth/confirm"
          element={<AuthConfirm />}
        />
        <Route
          path="/update-password"
          element={<UpdatePassword />}
        />

        {/* Protected routes */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        {/* Customers page - View all customers and purchase history */}
        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <CustomersPage />
            </ProtectedRoute>
          }
        />

        {/* Staff management - Owner only */}
        <Route
          path="/staff"
          element={
            <ProtectedRoute>
              <StaffManagement />
            </ProtectedRoute>
          }
        />

        {/* Referral dashboard - Earn rewards by inviting friends */}
        <Route
          path="/referrals"
          element={
            <ProtectedRoute>
              <ReferralDashboard />
            </ProtectedRoute>
          }
        />

        {/* Error Monitoring Dashboard - Admin only */}
        <Route
          path="/admin/monitoring"
          element={
            <ProtectedRoute>
              <ErrorMonitoringDashboard />
            </ProtectedRoute>
          }
        />

        {/* WhatsApp AI - Automated customer support */}
        <Route
          path="/whatsapp-ai"
          element={
            <ProtectedRoute>
              <WhatsAppAI />
            </ProtectedRoute>
          }
        />

        {/* Help Center - Browse all documentation guides */}
        <Route
          path="/help"
          element={
            <ProtectedRoute>
              <HelpCenter />
            </ProtectedRoute>
          }
        />

        {/* Invoices - B2B sales, credit sales, and payment tracking */}
        <Route
          path="/invoices"
          element={
            <ProtectedRoute>
              <Invoices />
            </ProtectedRoute>
          }
        />

        <Route
          path="/invoices/create"
          element={
            <ProtectedRoute>
              <CreateInvoice />
            </ProtectedRoute>
          }
        />

        <Route
          path="/invoices/:id"
          element={
            <ProtectedRoute>
              <InvoiceDetail />
            </ProtectedRoute>
          }
        />

        {/* Review Management - Moderate and respond to customer reviews */}
        <Route
          path="/reviews"
          element={
            <ProtectedRoute>
              <ReviewManagement />
            </ProtectedRoute>
          }
        />

        {/* Image enhancement test pages */}
        <Route
          path="/image-test"
          element={
            <ProtectedRoute>
              <ImageTest />
            </ProtectedRoute>
          }
        />

        <Route
          path="/direct-test"
          element={
            <ProtectedRoute>
              <DirectImageTest />
            </ProtectedRoute>
          }
        />

        <Route
          path="/all-variants"
          element={
            <ProtectedRoute>
              <AllVariantsTest />
            </ProtectedRoute>
          }
        />

        {/* Test page for VariantManager component */}
        <Route
          path="/test-variants"
          element={
            <ProtectedRoute>
              <TestVariants />
            </ProtectedRoute>
          }
        />

        {/* Dev preview route for Sale Modal V2 - Public for testing */}
        <Route path="/dev/sale-modal" element={<DevSaleModal />} />

        {/* Store Setup - Clean minimal design for quick store creation */}
        <Route path="/store-setup" element={<StoreSetup />} />

        {/* Store Quick Setup - 30-second store creation (Phase 1) */}
        <Route path="/quick-setup" element={<StoreQuickSetup />} />

        {/* Store Setup Complete - Post-creation dashboard */}
        <Route
          path="/setup-complete"
          element={
            <ProtectedRoute>
              <StoreSetupComplete />
            </ProtectedRoute>
          }
        />

        {/* Online Store Setup - Integrated setup with progressive disclosure */}
        <Route
          path="/online-store"
          element={
            <ProtectedRoute>
              <OnlineStoreSetup />
            </ProtectedRoute>
          }
        />

        {/* Redirect legacy settings routes */}
        <Route path="/store-settings" element={<Navigate to="/settings" replace />} />
        <Route path="/config" element={<Navigate to="/settings" replace />} />
        <Route path="/preferences" element={<Navigate to="/settings" replace />} />
        <Route path="/business-settings" element={<Navigate to="/settings" replace />} />
        <Route path="/account" element={<Navigate to="/settings" replace />} />
        <Route path="/profile" element={<Navigate to="/settings" replace />} />

        {/* Landing Page - Public marketing page */}
        <Route path="/landing" element={<LandingPage />} />

        {/* Testimonial Submission - Public form for customers */}
        <Route path="/submit-testimonial" element={<SubmitTestimonial />} />

        {/* Main dashboard */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <App />
            </ProtectedRoute>
          }
        />

        {/* Public storefront - accessible without login */}
        <Route path="/store/:slug" element={<StorefrontPage />} />

        {/* Public invoice view - accessible without login */}
        <Route path="/invoice/:id" element={<PublicInvoiceView />} />

        {/* Catch-all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
