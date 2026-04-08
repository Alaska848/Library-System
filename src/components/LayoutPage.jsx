import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import LoanNotifications from "./LoanNotifications";

export default function LayoutPage() {
  return (
    <div className="d-flex flex-column min-vh-100">
      {/* ✅ Runs silently in background — listens for loan status changes */}
      <LoanNotifications />
      <Navbar />
      <div className="flex-grow-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}
