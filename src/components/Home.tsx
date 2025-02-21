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
          <img
            src="/favicon.svg"
            alt="NoteBins Logo"
            className="w-24 h-24 mx-auto"
          />
          <h1 className="text-5xl font-light tracking-tight text-gray-900">
            Note<span className="font-semibold">Bins</span>
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
            <a
              href="/saved"
              className="ml-4 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
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
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
              View Saved Notes
            </a>
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
          <div className="flex justify-center items-center space-x-2 text-sm text-gray-600">
            <span>Created by</span>
            <a
              href="https://github.com/FahadPatwary"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 font-medium flex items-center"
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
              Fahad Ahmed Patwary
            </a>
          </div>
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
