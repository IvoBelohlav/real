import React, { Suspense } from "react";
import {
  RouterProvider,
  createBrowserRouter,
  Navigate,
  Outlet,
} from "react-router-dom";
import ErrorBoundary from "./ErrorBoundary";
import { getAuthToken } from "./utils/auth";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import styles from "./App.module.css";
import headingStyles from './headingFix.module.css'
import WidgetContainer from "./components/WidgetContainer";

// Direct import of Widget - NO lazy loading for now
import Widget from './components/Widget.jsx'; // Explicit .jsx extension
// Lazy load components (keep other lazy components as they are for now)
const AdminLayout = React.lazy(() => import("./components/admin/AdminLayout"));
const AdminStatistics = React.lazy(() =>
  import("./components/admin/AdminStatistics")
);
const ProductList = React.lazy(() => import("./components/admin/ProductList"));
const Login = React.lazy(() => import("./components/Login"));
const GuidedChatManager = React.lazy(() =>
  import("./components/admin/GuidedChatManager")
);
const ShopInfoManager = React.lazy(() => import("./components/admin/ShopInfoManager"));

const BusinessTypeManagement = React.lazy(() =>
  import("./components/admin/BusinessTypeManagement")
);
const WidgetFAQManager = React.lazy(() =>
  import("./components/admin/WidgetFAQManager")
);
const WidgetConfigManager = React.lazy(() =>
  import("./components/admin/WidgetConfigManager")
);
const ServerReset = React.lazy(() => import("./components/admin/ServerReset"));
const ConversationLogs = React.lazy(() => import("./components/admin/ConversationLogs"));
const AdminDashboard = React.lazy(() => import("./components/admin/AdminDashboard"));
const ContactAdminSubmissions = React.lazy(() => import("./components/admin/ContactAdminSubmissions"));



const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const PrivateOutlet = () => {
  const token = getAuthToken();
  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }
  return <Outlet />;
};

const router = createBrowserRouter([
  {
    children: [
      {
        path: "/",
        element: (
            <Widget />  // Render Widget directly - NO Suspense/lazy loading
        ),
      },
      {
        path: "admin/login",
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <Login />
          </Suspense>
        ),
      },
      {
        path: "admin",
        element: <PrivateOutlet />,
        children: [
          {
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <AdminLayout />
              </Suspense>
            ),
            children: [
              {
                index: true,
                element: (
                  <Suspense fallback={<LoadingFallback />}>
                    <AdminDashboard />
                  </Suspense>
                ),
              },
              {
                path: "statistics",
                element: (
                  <Suspense fallback={<LoadingFallback />}>
                    <AdminStatistics />
                  </Suspense>
                ),
              },
              {
                path: "shop-info",
                element: (
                  <Suspense fallback={<LoadingFallback />}>
                    <ShopInfoManager />
                  </Suspense>
                ),
              },
              {
                path: "products",
                element: (
                  <Suspense fallback={<LoadingFallback />}>
                    <ProductList />
                  </Suspense>
                ),
              },
              {
                path: "guided-chat",
                element: (
                  <Suspense fallback={<LoadingFallback />}>
                    <GuidedChatManager />
                  </Suspense>
                ),
              },
              {
                path: "business-types",
                element: (
                  <Suspense fallback={<LoadingFallback />}>
                    <BusinessTypeManagement />
                  </Suspense>
                ),
              },
              {
                path: "widget-config",
                element: (
                  <Suspense fallback={<LoadingFallback />}>
                    <WidgetConfigManager />
                  </Suspense>
                ),
              },
              {
                path: "conversations",
                element: (
                  <Suspense fallback={<LoadingFallback />}>
                    <ConversationLogs />
                  </Suspense>
                ),
              },
              {
                path: "contact-submissions",
                element: (
                  <Suspense fallback={<LoadingFallback />}>
                    <ContactAdminSubmissions />
                  </Suspense>
                ),
              },
              {
                path: "widget-faqs",
                element: (
                  <Suspense fallback={<LoadingFallback />}>
                    <WidgetFAQManager />
                  </Suspense>
                ),
              },
              {
                path: "server-options",
                element: (
                  <Suspense fallback={<LoadingFallback />}>
                    <ServerReset />
                  </Suspense>
                ),
              },
            ],
          },
        ],
      },
      {
        path: "*",
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);

const App = () => {
  return (
    <ErrorBoundary>
      <WidgetContainer>
        <RouterProvider router={router} />
        <ToastContainer position="top-right" autoClose={5000} />
      </WidgetContainer>
    </ErrorBoundary>
  );
};

export default App;