import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { api } from "./api.js";
import Login from "./pages/Login.jsx";
import ChildHome from "./pages/ChildHome.jsx";
import ParentHome from "./pages/ParentHome.jsx";

export default function App() {
  const [me, setMe] = useState(undefined); // undefined=loading, null=anon

  const refresh = () => api.me().then(setMe).catch(() => setMe(null));
  useEffect(() => { refresh(); }, []);

  if (me === undefined) return <div style={{ padding: 24 }}>加载中…</div>;

  return (
    <Routes>
      <Route path="/login" element={me ? <Navigate to="/" /> : <Login onLogin={refresh} />} />
      <Route path="/*" element={
        !me ? <Navigate to="/login" />
        : me.role === "parent" ? <ParentHome onLogout={refresh} />
        : <ChildHome me={me} onLogout={refresh} />
      } />
    </Routes>
  );
}
