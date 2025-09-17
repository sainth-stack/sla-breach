import "./App.css";
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import SelfMonitoring from "./pages/self-monitoring";
import IncidentManagement from "./pages/incident-management";
import KEDB from "./pages/kedb";
import DataSource from "./pages/data-source";
import {AdminLayout} from './layout'
import { MainPages } from "./pages/data";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route element={<AdminLayout />}>
          <Route path="/" element={<DataSource />} />
            <Route path="/data-source" element={<DataSource />} />
            <Route path="/self-monitoring" element={<MainPages />} />
            <Route path="/incident-management" element={<IncidentManagement />} />
            <Route path="/kedb" element={<KEDB />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;


