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

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Login /> },
      { path: "create-account", element: <CreateAccount /> },
      { path: "forgetPassword", element: <ForgetPassword /> },
      {
        element: <LayoutPage />,
        children: [
          {
            path: "home",
            element: (
              <ProtectedRoute allowedRole="user">
                <LibraryHome />
              </ProtectedRoute>
            ),
          },
          {
            path: "my-borrowed-books",
            element: (
              <ProtectedRoute allowedRole="user">
                <LibraryDashboard />
              </ProtectedRoute>
            ),
          },
          {
            path: "catalog",
            element: (
              <ProtectedRoute allowedRole="user">
                <Catalog />
              </ProtectedRoute>
            ),
          },
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
        ],
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;