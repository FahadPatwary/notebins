import { useEffect, useState } from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import "./App.css";
import { Home } from "./components/Home";
import { NoteEditor } from "./components/NoteEditor";
import { SavedNotes } from "./components/SavedNotes";
import WelcomePopup from "./components/WelcomePopup";

function App() {
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    // Check if user has seen the welcome message before
    const hasSeenWelcome = localStorage.getItem("hasSeenWelcome");
    if (!hasSeenWelcome) {
      setShowWelcome(true);
    }
  }, []);

  const handleCloseWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem("hasSeenWelcome", "true");
  };

  return (
    <>
      <WelcomePopup isOpen={showWelcome} onClose={handleCloseWelcome} />
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/saved" element={<SavedNotes />} />
          <Route path="/:id" element={<NoteEditor />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
