import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import IOSMobileEntryDocs from './pages/iOSMobileEntryDocs';
import RecentChanges from './pages/RecentChanges';
import TripSync from './pages/TripSync';
import VehicleStopReport from './pages/VehicleStopReport';
import NaitonApiDocs from './pages/NaitonApiDocs';
import FuelSurchargePage from './pages/FuelSurcharge';
import NaitonRawData from './pages/NaitonRawData';
import RitTijdRapportage from './pages/RitTijdRapportage';
import ProjectHours from './pages/ProjectHours';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/TripSync" element={
        <LayoutWrapper currentPageName="TripSync">
          <TripSync />
        </LayoutWrapper>
      } />
      <Route path="/RecentChanges" element={
        <LayoutWrapper currentPageName="RecentChanges">
          <RecentChanges />
        </LayoutWrapper>
      } />
      <Route path="/VehicleStopReport" element={
        <LayoutWrapper currentPageName="VehicleStopReport">
          <VehicleStopReport />
        </LayoutWrapper>
      } />
      <Route path="/iOSMobileEntryDocs" element={
        <LayoutWrapper currentPageName="iOSMobileEntryDocs">
          <IOSMobileEntryDocs />
        </LayoutWrapper>
      } />
      <Route path="/NaitonApiDocs" element={
        <LayoutWrapper currentPageName="NaitonApiDocs">
          <NaitonApiDocs />
        </LayoutWrapper>
      } />
      <Route path="/FuelSurcharge" element={
        <LayoutWrapper currentPageName="FuelSurcharge">
          <FuelSurchargePage />
        </LayoutWrapper>
      } />
      <Route path="/NaitonRawData" element={
        <LayoutWrapper currentPageName="NaitonRawData">
          <NaitonRawData />
        </LayoutWrapper>
      } />
      <Route path="/RitTijdRapportage" element={
        <LayoutWrapper currentPageName="RitTijdRapportage">
          <RitTijdRapportage />
        </LayoutWrapper>
      } />
      <Route path="/ProjectHours" element={
        <LayoutWrapper currentPageName="ProjectHours">
          <ProjectHours />
        </LayoutWrapper>
      } />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App