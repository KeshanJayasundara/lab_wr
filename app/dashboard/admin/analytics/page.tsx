import ManagerAnalyticsPage from "@/app/dashboard/manager/analytics/page";

// Admin sees exactly the same analytics as the Manager (same real-data chart).
// The APIs (/api/manager/analytics and /options) already allow both MANAGER and ADMIN.
export default function AdminAnalyticsPage() {
  return <ManagerAnalyticsPage />;
}