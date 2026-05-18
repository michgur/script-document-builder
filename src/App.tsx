import { BrowserRouter, Route, Routes } from "react-router-dom";

import EditorPoc2 from "./pages/EditorPoc2";

function App() {
  return (
    <BrowserRouter basename="/script-document-builder">
      <Routes>
        <Route path="/" element={<EditorPoc2 />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
