import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { noteService } from "../services/note";

export const Home = () => {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [noteLink, setNoteLink] = useState("");
  const [error, setError] = useState("");

  const handleCreateNote = async () => {
    try {
      setIsCreating(true);
      setError("");
      const note = await noteService.createNote("");
      navigate(`/${note.id}`);
    } catch (error) {
      console.error("Failed to create note:", error);
      setError("Failed to create note. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinNote = (e: React.FormEvent) => {
    e.preventDefault();
    const noteId = noteLink.trim();
    if (!noteId) {
      setError("Please enter a note link");
      return;
    }
    // Extract note ID from full URL if pasted
    const id = noteId.split("/").pop();
    if (id) {
      navigate(`/${id}`);
    } else {
      setError("Invalid note link");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-[100vw] space-y-12 text-center px-4 sm:px-6 lg:px-8">
        <div className="space-y-6 max-w-3xl mx-auto">
          <h1 className="text-5xl font-light tracking-tight text-gray-900">
            Note<span className="font-semibold">Share</span>
          </h1>
          <p className="text-xl text-gray-600">
            Create and share notes instantly, no sign-up required.
          </p>
        </div>

        <div className="space-y-8 max-w-xl mx-auto">
          <div className="space-y-4">
            <button
              onClick={handleCreateNote}
              disabled={isCreating}
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isCreating ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Creating...
                </span>
              ) : (
                <span className="flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Create New Note
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center max-w-md mx-auto">
            <div className="flex-grow h-px bg-gray-200"></div>
            <span className="px-4 text-sm text-gray-500">OR</span>
            <div className="flex-grow h-px bg-gray-200"></div>
          </div>

          <form
            onSubmit={handleJoinNote}
            className="space-y-4 max-w-md mx-auto"
          >
            <div>
              <label htmlFor="noteLink" className="sr-only">
                Note Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="noteLink"
                  value={noteLink}
                  onChange={(e) => setNoteLink(e.target.value)}
                  placeholder="Paste a note link or ID"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all"
                >
                  Join
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        </div>

        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <p className="text-sm text-gray-500">
            Your notes are automatically saved and synced in real-time.
          </p>
          <p className="text-xs text-gray-400">
            Share the URL with others to collaborate.
          </p>
        </div>
      </div>
    </div>
  );
};
