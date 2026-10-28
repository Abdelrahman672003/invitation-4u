import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { AuthLayout, SiteLayout } from '@/components/layout/Layouts';
import { AdminOverviewPage } from '@/features/admin/AdminOverviewPage';
import {
  AdminAuditPage,
  AdminCatalogPage,
  AdminInvitationsPage,
  AdminLayout,
  AdminPackagesPage,
  AdminPaymentsPage,
  AdminTemplatesPage,
  AdminUsersPage,
} from '@/features/admin/AdminPages';
import { AccountPage } from '@/features/auth/AccountPage';
import {
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
} from '@/features/auth/AuthPages';
import { RedirectIfAuthenticated, RequireAuth } from '@/features/auth/guards';
import { TemplateGalleryPage, TemplatePreviewPage } from '@/features/templates/TemplatePages';
import { EditorPage } from '@/features/invitations/EditorPage';
import { ManagePage } from '@/features/invitations/ManagePage';
import { PublicInvitationPage } from '@/features/invitations/PublicInvitationPage';
import {
  PaymentReturnPage,
  PaymentsPage,
  TestCheckoutPage,
} from '@/features/payments/PaymentPages';
import { NewInvitationPage } from '@/features/invitations/NewInvitationPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { TemplateBuilderPage } from '@/features/admin/TemplateBuilderPage';
import { StudioPage } from '@/features/studio/StudioPage';
import { NotFoundPage } from '@/pages/ErrorPages';
import { CategoryPage, ContactPage, HomePage, LegalPage } from '@/pages/MarketingPages';
import { StyleguidePage } from '@/pages/StyleguidePage';

export const routes: RouteObject[] = [
  {
    element: <SiteLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'categories/:slug', element: <CategoryPage /> },
      // Old addresses keep working: they land on the matching home page section.
      { path: 'how-it-works', element: <Navigate to="/#how-it-works" replace /> },
      { path: 'pricing', element: <Navigate to="/#pricing" replace /> },
      { path: 'faq', element: <Navigate to="/#faq" replace /> },
      { path: 'contact', element: <ContactPage /> },
      { path: 'terms', element: <LegalPage doc="terms" /> },
      { path: 'privacy', element: <LegalPage doc="privacy" /> },
      { path: 'refund-policy', element: <LegalPage doc="refund" /> },
      { path: 'templates', element: <TemplateGalleryPage /> },
      { path: 'templates/:slug', element: <TemplatePreviewPage /> },
      {
        path: 'dashboard',
        element: (
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        ),
      },
      {
        path: 'invitations/new',
        element: (
          <RequireAuth>
            <NewInvitationPage />
          </RequireAuth>
        ),
      },
      {
        path: 'invitations/:id/edit',
        element: (
          <RequireAuth>
            <EditorPage />
          </RequireAuth>
        ),
      },
      {
        path: 'invitations/:id/studio',
        element: (
          <RequireAuth>
            <StudioPage />
          </RequireAuth>
        ),
      },
      {
        path: 'invitations/:id/manage',
        element: (
          <RequireAuth>
            <ManagePage />
          </RequireAuth>
        ),
      },
      {
        path: 'payments',
        element: (
          <RequireAuth>
            <PaymentsPage />
          </RequireAuth>
        ),
      },
      {
        path: 'payments/return',
        element: (
          <RequireAuth>
            <PaymentReturnPage />
          </RequireAuth>
        ),
      },
      {
        path: 'pay/test/:reference',
        element: (
          <RequireAuth>
            <TestCheckoutPage />
          </RequireAuth>
        ),
      },
      {
        path: 'account',
        element: (
          <RequireAuth>
            <AccountPage />
          </RequireAuth>
        ),
      },
      {
        path: 'admin',
        element: (
          <RequireAuth role="ADMIN">
            <AdminLayout />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <AdminOverviewPage /> },
          { path: 'users', element: <AdminUsersPage /> },
          { path: 'invitations', element: <AdminInvitationsPage /> },
          { path: 'templates', element: <AdminTemplatesPage /> },
          { path: 'templates/builder', element: <TemplateBuilderPage /> },
          { path: 'templates/builder/:id', element: <TemplateBuilderPage /> },
          { path: 'catalog', element: <AdminCatalogPage /> },
          { path: 'packages', element: <AdminPackagesPage /> },
          { path: 'payments', element: <AdminPaymentsPage /> },
          { path: 'audit', element: <AdminAuditPage /> },
        ],
      },
      ...(import.meta.env.DEV ? [{ path: 'styleguide', element: <StyleguidePage /> }] : []),
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  { path: 'i/:slug', element: <PublicInvitationPage /> },
  {
    element: <AuthLayout />,
    children: [
      {
        path: 'login',
        element: (
          <RedirectIfAuthenticated>
            <LoginPage />
          </RedirectIfAuthenticated>
        ),
      },
      {
        path: 'register',
        element: (
          <RedirectIfAuthenticated>
            <RegisterPage />
          </RedirectIfAuthenticated>
        ),
      },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
