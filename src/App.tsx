import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import NewPrayer from "./pages/NewPrayer";
import Calendar from "./pages/Calendar";
import MemberManagement from "./pages/MemberManagement";
import PrayerDetail from "./pages/PrayerDetail";
import AdminSettings from "./pages/AdminSettings";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import EditProfile from "./pages/EditProfile";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";
import BibleReadingDashboard from "./pages/BibleReadingDashboard";
import AllPrayers from "./components/AllPrayers";
import BibleVerseManager from "./components/BibleVerseManager";
import AccountingDashboard from "./pages/AccountingDashboard";
import AccountingTransactions from "./pages/AccountingTransactions";
import AccountingInvoices from "./pages/AccountingInvoices";

import Debug from "./debug";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/debug" element={<Debug />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/edit" element={<EditProfile />} />
              <Route path="/new-prayer" element={<NewPrayer />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/groups" element={<MemberManagement />} />
              <Route path="/prayer/:id" element={<PrayerDetail />} />
              <Route path="/admin" element={<AdminSettings />} />
              <Route path="/bible-reading" element={<BibleReadingDashboard />} />
              <Route path="/bible-manager" element={<BibleVerseManager />} />
              <Route path="/all-prayers" element={<AllPrayers />} />
              <Route path="/accounting" element={<AccountingDashboard />} />
              <Route path="/accounting/transactions" element={<AccountingTransactions />} />
              <Route path="/accounting/invoices" element={<AccountingInvoices />} />

              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
