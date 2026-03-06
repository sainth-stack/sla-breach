import React from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import "./style.css";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { canAccessPath, DEFAULT_PATH_FOR_LIMITED_USER } from "../utils/permissions";

function getStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AdminLayout() {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const isAuthenticatedFlag = localStorage.getItem("isAuthenticated") === "true";
  const user = getStoredUser();
  const isAuthenticated = !!token && !!isAuthenticatedFlag && !!user;

  // Without login: redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Based on permission: redirect to allowed default if path not allowed
  const isSuperAdmin = !!(user.isSuperAdmin);
  const path = location.pathname;
  if (!canAccessPath(path, isSuperAdmin)) {
    return <Navigate to={DEFAULT_PATH_FOR_LIMITED_USER} replace />;
  }

  return (
    <div className="row p-0 m-0">
      <div className="col-lg-12 col-md-12 col-sm-12 col-xs-12 p-0 m-0">
        <Navbar />
        <div className="d-flex justify-content-between">
          <div className={""}>
            <Sidebar />
          </div>
          <div className="p-0 w-100 main-content2">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
