import { Suspense, lazy } from 'react';
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import "./App.css";
import { Loading } from './components/Loading';

// Lazy load components
const Home = lazy(() => import("./components/Home").then(module => ({ default: module.Home })));
const NoteEditor = lazy(() => import("./components/NoteEditor").then(module => ({ default: module.NoteEditor })));
const SavedNotes = lazy(() => import("./components/SavedNotes").then(module => ({ default: module.SavedNotes })));

function App() {
  return (
    <Router>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/saved" element={<SavedNotes />} />
          <Route path="/:id" element={<NoteEditor />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
