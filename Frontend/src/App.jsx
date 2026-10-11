import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Quest from "./pages/Quest";
import Journal from "./pages/Journal";

// App ki main structure – naya page add karna ho toh yahan route add karo
export default function App() {
  return (
    <BrowserRouter>
      <div className="page-wrapper">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/quest" element={<Quest />} />
          <Route path="/journal" element={<Journal />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
