import './App.css';
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Login from "./components/login";
import Layout from "./components/Layout";
import CreateAccount from "./components/CreateAccount";
import ForgetPassword from './components/ForgetPassword';
import BooksM from './components/admin/BooksM';
import LayoutPage from './components/LayoutPage';
import LibraryHome from './components/LibraryHome';

import BorrowingLog from "./components/admin/BorrowingLog";
import LibraryDashboard from  "./components/LibraryDashboard (1)"

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
          { path: "home", element: <LibraryHome /> },
           // ابحثي عن هذا السطر في App.js وغيريه كالتالي:
{ path: "my-borrowed-books", element: <LibraryDashboard /> },
          { path: "admin/BooksM", element: <BooksM /> },
          { path: "admin/BorrowingLog", element: <BorrowingLog /> },
        ],
      },
    ],
  },
]);

function App() {
  return (
    <>
      <RouterProvider router={router} />
    </>
  );
}

export default App;
