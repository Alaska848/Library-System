import './App.css';
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Login from "./components/login";
import Layout from "./components/Layout";
import CreateAccount from "./components/CreateAccount";
import ForgetPassword from './components/ForgetPassword';
import BooksM from './components/admin/BooksM';
import LayoutPage from './components/LayoutPage';
import LibraryHome from './components/LibraryHome';
import UserManagement from './components/admin/UserManagement';
import BorrowingLog from "./components/admin/BorrowingLog";
import LibraryDashboard from "./components/LibraryDashboard";
import Catalog from "./components/Catalog";
import ProtectedRoute from "./components/ProtectedRoute";
import SubmitBookDr from "./components/SubmitBookDr";
import FacultyRequests from "./components/admin/FacultyRequests";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      // ✅ صفحات بدون Navbar (login / register)
      { path: "login", element: <Login /> },
      { path: "create-account", element: <CreateAccount /> },
      { path: "forgetPassword", element: <ForgetPassword /> },

      // ✅ كل الصفحات اللي فيها Navbar
      {
        element: <LayoutPage />,
        children: [
          // الصفحة الرئيسية تفتح للكل على / مباشرة
          { index: true, element: <LibraryHome /> },
          { path: "home", element: <LibraryHome /> },

          // Catalog مفتوح للكل — الاستعارة بتطلب login جوه الكومبوننت
          { path: "catalog", element: <Catalog /> },

          // صفحات محمية للـ user
          {
            path: "my-borrowed-books",
            element: (
              <ProtectedRoute allowedRole="user">
                <LibraryDashboard />
              </ProtectedRoute>
            ),
          },

          // صفحات الأدمن
          {
            path: "admin/BooksM",
            element: (
              <ProtectedRoute allowedRole="admin">
                <BooksM />
              </ProtectedRoute>
            ),
          },
          {
            path: "admin/BorrowingLog",
            element: (
              <ProtectedRoute allowedRole="admin">
                <BorrowingLog />
              </ProtectedRoute>
            ),
          },
          {
            path: "admin/UserManagement",
            element: (
              <ProtectedRoute allowedRole="admin">
                <UserManagement />
              </ProtectedRoute>
            ),
          },
          {
            path: "admin/FacultyRequests",
            element: (
              <ProtectedRoute allowedRole="admin">
                <FacultyRequests />
              </ProtectedRoute>
            ),
          },

          // Doctor
          {
            path: "submit-book-Dr",
            element: (
              <ProtectedRoute allowedRole="doctor">
                <SubmitBookDr />
              </ProtectedRoute>
            ),
          },
        ],
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
