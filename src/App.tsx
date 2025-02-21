import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import "./App.css";
import { Home } from "./components/Home";
import { NoteEditor } from "./components/NoteEditor";
import { SavedNotes } from "./components/SavedNotes";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/saved" element={<SavedNotes />} />
        <Route path="/:id" element={<NoteEditor />} />
      </Routes>
    </Router>
  );
}

export default App;
