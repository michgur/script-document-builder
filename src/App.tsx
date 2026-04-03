import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import EditorPoc from "./pages/EditorPoc";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/editor" replace />} />
        <Route path="/editor" element={<EditorPoc />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
