import "./App.css";
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import { MainPages } from "./pages/data";
import Bot from "./pages/bot";
import {AdminLayout} from './layout'
import HolidayList from "./pages/data/holiday-list";
import { Login } from "./pages/Auth/login";
// import SharePoint from "./pages/share-point";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<MainPages />} />
          <Route path="/" element={<AdminLayout />}>
               <Route path="/" element={<MainPages />} />
               <Route path="/bot" element={<Bot />} />
               <Route path="/holiday-list" element={<HolidayList />} />
               {/* <Route path="/share-point" element={<SharePoint />} /> */}
               {/* <Route path="/login" element={<Login />} /> */}
        </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;


