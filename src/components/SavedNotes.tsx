import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { noteService } from "../services/note";

interface SavedNote {
  _id: string;
  title: string;
  content: string;
  noteId: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export const SavedNotes = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<SavedNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadSavedNotes();
  }, []);

  const loadSavedNotes = async () => {
    try {
      setIsLoading(true);
      const savedNotes = await noteService.getSavedNotes();
      setNotes(savedNotes);
    } catch (error) {
      console.error("Error loading saved notes:", error);
      setError("Failed to load saved notes. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm("Are you sure you want to delete this saved note?")) return;

    try {
      await noteService.deleteSavedNote(id);
      setNotes((prevNotes) => prevNotes.filter((note) => note._id !== id));
    } catch (error) {
      console.error("Error deleting note:", error);
      alert("Failed to delete note. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-pulse text-gray-500">
          Loading saved notes...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">
              Saved Notes
            </h1>
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Create New Note
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 text-red-700 bg-red-100 rounded-md">
              {error}
            </div>
          )}

          {notes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No saved notes yet.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {notes.map((note) => (
                <div
                  key={note._id}
                  className="bg-white overflow-hidden shadow rounded-lg"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {note.title}
                      </h3>
                      <button
                        onClick={() => handleDeleteNote(note._id)}
                        className="text-gray-400 hover:text-red-500"
                        title="Delete note"
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </p>
                    <div className="text-gray-500 text-sm mb-4 line-clamp-3">
                      {note.content}
                    </div>
                    <a
                      href={note.url}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Open Note →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
