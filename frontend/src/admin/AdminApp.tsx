// frontend/src/admin/AdminApp.tsx
import { useLocation } from "wouter";
import { UserList } from "./pages/users/UserList";
import { UserShow } from "./pages/users/UserShow";
import { ActivityList } from "./pages/activity/ActivityList";
import { AdminActivityList } from "./pages/admin-activity/AdminActivityList";
import { Dashboard } from "./pages/dashboard/Dashboard";
import { Layout } from "./components/Layout";

export const AdminApp = () => {
  const [location] = useLocation();

  const renderContent = () => {
    if (location === "/admin") {
      return <Dashboard />;
    } else if (location === "/admin/users") {
      return <UserList />;
    } else if (location.startsWith("/admin/users/")) {
      return <UserShow />;
    } else if (location === "/admin/activity") {
      return <ActivityList />;
    } else if (location === "/admin/admin-activity") {
      return <AdminActivityList />;
    } else {
      return <Dashboard />;
    }
  };

  return (
    <Layout>
      {renderContent()}
    </Layout>
  );
};
