import "./App.css";
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import { MainPages } from "./pages/data";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<MainPages />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
