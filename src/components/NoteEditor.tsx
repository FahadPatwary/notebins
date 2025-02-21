import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import type { SavedNote } from "../services/note";
import { noteService } from "../services/note";
import { socketService } from "../services/socket";
import { Note } from "../types";

const EXPIRATION_TIME = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds

interface FormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  fontSize: string;
  alignment: string;
}

interface SavePromptState {
  isOpen: boolean;
  title: string;
  password: string;
  showPassword: boolean;
  error: string;
}

export const NoteEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingToLibrary, setIsSavingToLibrary] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [showCopied, setShowCopied] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLocalUpdate = useRef(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [formatState, setFormatState] = useState<FormatState>({
    bold: false,
    italic: false,
    underline: false,
    fontSize: "3",
    alignment: "left",
  });
  const [isNoteSaved, setIsNoteSaved] = useState(false);
  const [existingNote, setExistingNote] = useState<SavedNote | null>(null);
  const [error, setError] = useState("");
  const [savePrompt, setSavePrompt] = useState<SavePromptState>({
    isOpen: false,
    title: "",
    password: "",
    showPassword: false,
    error: "",
  });

  useEffect(() => {
    if (!id) {
      navigate("/");
      return;
    }

    const loadNote = async () => {
      try {
        const loadedNote = await noteService.getNote(id);
        if (loadedNote) {
          setNote(loadedNote);
          setContent(loadedNote.content);
          if (editorRef.current) {
            editorRef.current.innerHTML = loadedNote.content;
          }
          setShareUrl(window.location.href);
          setLastSaved(new Date(loadedNote.updatedAt));

          // Check if note already exists in library
          const existingNote = await noteService.checkExistingNote(id);
          if (existingNote) {
            console.log("Found existing note:", existingNote.title);
            setExistingNote(existingNote);
            setIsNoteSaved(true);

            // Show toast notification for existing note
            toast(
              "This note is already saved. Changes will update the existing note.",
              {
                icon: "ℹ️",
                position: "bottom-right",
                duration: 4000,
              }
            );
          } else {
            // Reset state for new notes
            setExistingNote(null);
            setIsNoteSaved(false);
          }
        } else {
          navigate("/");
        }
      } catch (error) {
        console.error("Error loading note:", error);
        navigate("/");
      }
    };

    loadNote();
    socketService.joinNote(id);

    return () => {
      socketService.leaveNote(id);
    };
  }, [id, navigate]);

  useEffect(() => {
    if (note?.createdAt) {
      const updateTimer = () => {
        const now = new Date().getTime();
        const createdTime = new Date(note.createdAt).getTime();
        const remaining = EXPIRATION_TIME - (now - createdTime);

        if (remaining <= 0) {
          setTimeRemaining(0);
          return;
        }

        setTimeRemaining(remaining);
      };

      updateTimer();
      const timer = setInterval(updateTimer, 1000);
      return () => clearInterval(timer);
    }
  }, [note?.createdAt]);

  const handleContentChange = useCallback(() => {
    if (!editorRef.current) return;

    const newContent = editorRef.current.innerHTML;
    if (newContent === content) return;

    isLocalUpdate.current = true;
    setContent(newContent);

    // Clear existing timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Debounce the update
    updateTimeoutRef.current = setTimeout(async () => {
      if (!id) return;

      setIsSaving(true);
      try {
        await noteService.updateNote(id, newContent);
        socketService.updateNote({
          noteId: id,
          content: newContent,
        });
        setLastSaved(new Date());
      } catch (error) {
        console.error("Error saving note:", error);
      } finally {
        setIsSaving(false);
        isLocalUpdate.current = false;
      }
    }, 300);
  }, [id, content]);

  useEffect(() => {
    const handleNoteUpdate = (update: { noteId: string; content: string }) => {
      if (
        update.noteId === id &&
        update.content !== content &&
        !isLocalUpdate.current &&
        editorRef.current
      ) {
        const selection = window.getSelection();
        const range = selection?.getRangeAt(0);
        const startOffset = range?.startOffset;
        const endOffset = range?.endOffset;

        editorRef.current.innerHTML = update.content;
        setContent(update.content);
        setLastSaved(new Date());

        // Restore cursor position
        if (
          selection &&
          range &&
          startOffset !== undefined &&
          endOffset !== undefined
        ) {
          const newRange = document.createRange();
          newRange.setStart(
            editorRef.current,
            Math.min(startOffset, editorRef.current.childNodes.length)
          );
          newRange.setEnd(
            editorRef.current,
            Math.min(endOffset, editorRef.current.childNodes.length)
          );
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      } else {
        console.log("This problem");
      }
    };

    socketService.onNoteUpdate(handleNoteUpdate);
    return () => {
      socketService.offNoteUpdate(handleNoteUpdate);
    };
  }, [id, content]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  const copyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl).then(
      () => {
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      },
      () => alert("Failed to copy share link")
    );
  };

  const formatText = useCallback(
    (command: string, value?: string) => {
      document.execCommand(command, false, value);

      // Update format state based on current selection
      const updateFormatState = () => {
        setFormatState({
          bold: document.queryCommandState("bold"),
          italic: document.queryCommandState("italic"),
          underline: document.queryCommandState("underline"),
          fontSize: document.queryCommandValue("fontSize") || "3",
          alignment: document.queryCommandValue("justify") || "left",
        });
      };

      updateFormatState();
      handleContentChange();
    },
    [handleContentChange]
  );

  // Add selection change listener
  useEffect(() => {
    const handleSelectionChange = () => {
      setFormatState({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        fontSize: document.queryCommandValue("fontSize") || "3",
        alignment: document.queryCommandValue("justify") || "left",
      });
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  // Handle double-click on formatting buttons
  const handleFormatButtonDoubleClick = (command: string, value?: string) => {
    setFormatState((prev) => ({
      ...prev,
      [command]: !prev[command as keyof FormatState],
    }));
    // The next typed text will use this format
    document.execCommand(command, false, value);
  };

  const handleSaveToLibrary = async () => {
    if (!id) return;

    try {
      // Check if note already exists
      const existingNote = await noteService.checkExistingNote(id);

      if (existingNote) {
        // If note exists, update it with existing title and password status
        handleSaveConfirm({
          title: existingNote.title,
          password: existingNote.isPasswordProtected ? "" : undefined,
        });
      } else {
        // If new note, show prompt for title and optional password
        setSavePrompt({
          isOpen: true,
          title: "",
          password: "",
          showPassword: false,
          error: "",
        });
      }
    } catch (error) {
      console.error("Error checking existing note:", error);
      setError("Failed to check if note exists. Please try again.");
    }
  };

  const handleSaveConfirm = async ({
    title,
    password,
  }: {
    title: string;
    password?: string;
  }) => {
    if (!id) return;

    try {
      setIsSavingToLibrary(true);
      setError("");

      const savedNote = await noteService.saveNoteToLibrary({
        title,
        noteId: id,
        content: content || "",
        password,
      });

      // Update all relevant state
      setIsSavingToLibrary(false);
      setSavePrompt((prev) => ({ ...prev, isOpen: false }));
      setShowSaveSuccess(true);
      setIsNoteSaved(true);
      setExistingNote(savedNote);

      // Show appropriate toast message
      toast.success(
        savedNote.isNew
          ? "Note saved successfully!"
          : "Note updated successfully!",
        {
          position: "bottom-right",
          duration: 3000,
        }
      );

      setTimeout(() => {
        setShowSaveSuccess(false);
      }, 2000);
    } catch (err) {
      setIsSavingToLibrary(false);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save note. Please try again."
      );
      console.error("Error saving note:", err);
    }
  };

  const formatTimeRemaining = (ms: number): string => {
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));

    if (days > 0) {
      return `${days}d ${hours}h remaining`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  const renderSavePrompt = () => {
    if (!savePrompt.isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
          <h3 className="text-lg font-semibold mb-4">
            {isNoteSaved ? "Update Note" : "Save Note"}
          </h3>
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Title
              </label>
              <input
                id="title"
                type="text"
                placeholder="Enter note title"
                value={savePrompt.title}
                onChange={(e) =>
                  setSavePrompt((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                disabled={isSavingToLibrary}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password Protection
              </label>
              <div className="relative">
                <input
                  type={savePrompt.showPassword ? "text" : "password"}
                  placeholder="Optional password"
                  value={savePrompt.password}
                  onChange={(e) =>
                    setSavePrompt((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 pr-10"
                />
                <button
                  type="button"
                  onClick={() =>
                    setSavePrompt((prev) => ({
                      ...prev,
                      showPassword: !prev.showPassword,
                    }))
                  }
                  className="absolute inset-y-0 right-0 px-3 flex items-center"
                >
                  {savePrompt.showPassword ? (
                    <svg
                      className="h-5 w-5 text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5 text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  )}
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {savePrompt.password
                  ? "Note will be password protected"
                  : "Leave empty for no password protection"}
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => {
                setSavePrompt((prev) => ({ ...prev, isOpen: false }));
                setError("");
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              disabled={isSavingToLibrary}
            >
              Cancel
            </button>
            <button
              onClick={() =>
                handleSaveConfirm({
                  title: savePrompt.title,
                  password: savePrompt.password || undefined,
                })
              }
              disabled={!savePrompt.title.trim() || isSavingToLibrary}
              className={`px-4 py-2 rounded ${
                !savePrompt.title.trim() || isSavingToLibrary
                  ? "bg-blue-300 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600"
              } text-white flex items-center space-x-2`}
            >
              {isSavingToLibrary ? (
                <>
                  <span className="animate-spin">⌛</span>
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isNoteSaved ? "Update" : "Save"}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Update the save button in the header
  const renderSaveButton = () => (
    <button
      onClick={handleSaveToLibrary}
      disabled={isSavingToLibrary}
      className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
    >
      {isSavingToLibrary ? (
        <span className="flex items-center">
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700"
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
          {existingNote ? "Updating..." : "Saving..."}
        </span>
      ) : showSaveSuccess ? (
        <span className="flex items-center">
          <svg
            className="w-4 h-4 mr-2 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          {existingNote ? "Updated!" : "Saved!"}
        </span>
      ) : existingNote ? (
        <span className="flex items-center">
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Update Note
        </span>
      ) : (
        <span className="flex items-center">
          <svg
            className="w-4 h-4 mr-2"
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
          Save to Library
        </span>
      )}
    </button>
  );

  // Add connection status indicator
  const renderConnectionStatus = () => (
    <div
      className={`fixed bottom-4 right-4 px-3 py-1 rounded-full flex items-center space-x-2 ${
        socketService.getConnectionStatus()
          ? "bg-green-100 text-green-800"
          : "bg-red-100 text-red-800"
      }`}
    >
      <div
        className={`w-2 h-2 rounded-full ${
          socketService.getConnectionStatus() ? "bg-green-500" : "bg-red-500"
        }`}
      />
      <span className="text-sm">
        {socketService.getConnectionStatus() ? "Connected" : "Reconnecting..."}
      </span>
    </div>
  );

  if (!note && id) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFCFC] flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-10">
        <div className="w-full px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <img src="/favicon.svg" alt="NoteBins Logo" className="w-8 h-8" />
              <a
                href="/"
                className="text-xl font-semibold text-gray-900 hover:text-gray-700 transition-colors"
              >
                NoteBins
              </a>
              <div className="h-4 w-px bg-gray-200" />
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500 animate-fade hidden sm:inline-block">
                  {isSaving
                    ? "Saving changes..."
                    : lastSaved
                    ? `Last saved ${lastSaved.toLocaleTimeString()}`
                    : "All changes saved"}
                </span>
                {timeRemaining !== null && (
                  <span className="text-sm text-orange-500">
                    Expires in: {formatTimeRemaining(timeRemaining)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {renderSaveButton()}
              {shareUrl && (
                <button
                  onClick={copyShareUrl}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
                >
                  {showCopied ? (
                    <span className="flex items-center">
                      <svg
                        className="w-4 h-4 mr-2 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Copied!
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                        />
                      </svg>
                      Share
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="fixed top-16 left-0 right-0 bg-white border-b border-gray-200 z-10">
        <div className="w-full px-4 py-2">
          <div className="flex items-center space-x-2 overflow-x-auto">
            <button
              onClick={() => formatText("bold")}
              onDoubleClick={() => handleFormatButtonDoubleClick("bold")}
              className={`p-2 hover:bg-gray-100 rounded ${
                formatState.bold ? "bg-gray-200" : ""
              }`}
              title="Bold (Double-click to toggle)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M8.21 13c2.106 0 3.412-1.087 3.412-2.823 0-1.306-.984-2.283-2.324-2.386v-.055a2.176 2.176 0 0 0 1.852-2.14c0-1.51-1.162-2.46-3.014-2.46H3.843V13zM5.908 4.674h1.696c.963 0 1.517.451 1.517 1.244 0 .834-.629 1.32-1.73 1.32H5.908V4.673zm0 6.788V8.598h1.73c1.217 0 1.88.492 1.88 1.415 0 .943-.643 1.449-1.832 1.449H5.907z" />
              </svg>
            </button>
            <button
              onClick={() => formatText("italic")}
              onDoubleClick={() => handleFormatButtonDoubleClick("italic")}
              className={`p-2 hover:bg-gray-100 rounded ${
                formatState.italic ? "bg-gray-200" : ""
              }`}
              title="Italic (Double-click to toggle)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M7.991 11.674 9.53 4.455c.123-.595.246-.71 1.347-.807l.11-.52H7.211l-.11.52c1.06.096 1.128.212 1.005.807L6.57 11.674c-.123.595-.246.71-1.346.806l-.11.52h3.774l.11-.52c-1.06-.095-1.129-.211-1.006-.806z" />
              </svg>
            </button>
            <button
              onClick={() => formatText("underline")}
              onDoubleClick={() => handleFormatButtonDoubleClick("underline")}
              className={`p-2 hover:bg-gray-100 rounded ${
                formatState.underline ? "bg-gray-200" : ""
              }`}
              title="Underline (Double-click to toggle)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M5.313 3.136h-1.23V9.54c0 2.105 1.47 3.623 3.917 3.623s3.917-1.518 3.917-3.623V3.136h-1.23v6.323c0 1.49-.978 2.57-2.687 2.57-1.709 0-2.687-1.08-2.687-2.57V3.136zM12.5 15h-9v-1h9v1z" />
              </svg>
            </button>
            <div className="h-4 w-px bg-gray-200" />
            <select
              onChange={(e) => formatText("fontSize", e.target.value)}
              value={formatState.fontSize}
              className="p-2 border rounded text-sm"
              title="Font Size"
            >
              <option value="3">Normal</option>
              <option value="1">Small</option>
              <option value="5">Large</option>
              <option value="7">Huge</option>
            </select>
            <div className="h-4 w-px bg-gray-200" />
            <button
              onClick={() => formatText("insertUnorderedList")}
              className="p-2 hover:bg-gray-100 rounded"
              title="Bullet List"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path
                  fillRule="evenodd"
                  d="M5 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm-3 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"
                />
              </svg>
            </button>
            <button
              onClick={() => formatText("insertOrderedList")}
              className="p-2 hover:bg-gray-100 rounded"
              title="Numbered List"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path
                  fillRule="evenodd"
                  d="M5 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zM1.713 11.865v-.474H2c.217 0 .363-.137.363-.317 0-.185-.158-.31-.31-.31-.223 0-.367.152-.373.31h-.59c.016-.467.373-.787.986-.787.588-.002.954.291.957.703a.595.595 0 0 1-.492.594v.033a.615.615 0 0 1 .569.631c.003.533-.502.8-1.051.8-.656 0-1-.37-1.008-.794h.582c.008.178.186.306.422.309.254 0 .424-.145.422-.35-.002-.195-.155-.348-.414-.348h-.3zm-.004-4.699h-.604v-.035c0-.408.295-.844.958-.844.583 0 .96.326.96.756 0 .389-.257.617-.476.848l-.537.572v.03h1.054V9H1.143v-.395l.957-.99c.138-.142.293-.304.293-.508 0-.18-.147-.32-.342-.32a.33.33 0 0 0-.342.338v.041zm2.188-2.677H1.51v-.036c0-.408.295-.844.958-.844.583 0 .96.326.96.756 0 .389-.257.617-.476.848l-.537.572v.03h1.054V4H1.143v-.395l.957-.99c.138-.142.293-.304.293-.508 0-.18-.147-.32-.342-.32a.33.33 0 0 0-.342.338v.041h-.59z"
                />
              </svg>
            </button>
            <div className="h-4 w-px bg-gray-200" />
            <button
              onClick={() => formatText("justifyLeft")}
              onDoubleClick={() => handleFormatButtonDoubleClick("justifyLeft")}
              className={`p-2 hover:bg-gray-100 rounded ${
                formatState.alignment === "left" ? "bg-gray-200" : ""
              }`}
              title="Align Left (Double-click to toggle)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path
                  fillRule="evenodd"
                  d="M2 12.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"
                />
              </svg>
            </button>
            <button
              onClick={() => formatText("justifyCenter")}
              onDoubleClick={() =>
                handleFormatButtonDoubleClick("justifyCenter")
              }
              className={`p-2 hover:bg-gray-100 rounded ${
                formatState.alignment === "center" ? "bg-gray-200" : ""
              }`}
              title="Align Center (Double-click to toggle)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path
                  fillRule="evenodd"
                  d="M4 12.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"
                />
              </svg>
            </button>
            <button
              onClick={() => formatText("justifyRight")}
              onDoubleClick={() =>
                handleFormatButtonDoubleClick("justifyRight")
              }
              className={`p-2 hover:bg-gray-100 rounded ${
                formatState.alignment === "right" ? "bg-gray-200" : ""
              }`}
              title="Align Right (Double-click to toggle)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path
                  fillRule="evenodd"
                  d="M6 12.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-4-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm4-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-4-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"
                />
              </svg>
            </button>
            <div className="h-4 w-px bg-gray-200" />
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-grow pt-28">
        <div className="w-full px-4 sm:px-6 py-6 flex justify-center">
          <div className="w-[80vw] min-h-[calc(100vh-16rem)] bg-white shadow-sm rounded-lg">
            <div
              ref={editorRef}
              contentEditable
              onInput={handleContentChange}
              className="w-full h-full p-6 md:p-8 focus:outline-none text-gray-900 text-base md:text-lg"
              style={{
                fontFamily:
                  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                minHeight: "calc(100vh - 16rem)",
                whiteSpace: "pre-wrap",
                overflowWrap: "break-word",
              }}
              spellCheck="true"
              data-placeholder="Start typing..."
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 bg-white border-t border-gray-200">
        <div className="container mx-auto px-4 sm:px-6">
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
        </div>
      </footer>

      {renderSavePrompt()}
      {renderConnectionStatus()}
    </div>
  );
};
