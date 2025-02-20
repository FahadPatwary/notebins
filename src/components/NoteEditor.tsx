import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { noteService } from "../services/note";
import { socketService } from "../services/socket";
import { Note } from "../types";

export const NoteEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [showCopied, setShowCopied] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLocalUpdate = useRef(false);

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

  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    handleContentChange();
  };

  if (!note && id) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFCFC]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-10">
        <div className="w-full px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <a
                href="/"
                className="text-xl font-semibold text-gray-900 hover:text-gray-700 transition-colors"
              >
                NoteShare
              </a>
              <div className="h-4 w-px bg-gray-200" />
              <span className="text-sm text-gray-500 animate-fade hidden sm:inline-block">
                {isSaving
                  ? "Saving changes..."
                  : lastSaved
                  ? `Last saved ${lastSaved.toLocaleTimeString()}`
                  : "All changes saved"}
              </span>
            </div>
            <div className="flex items-center space-x-4">
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
              className="p-2 hover:bg-gray-100 rounded"
              title="Bold"
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
              className="p-2 hover:bg-gray-100 rounded"
              title="Italic"
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
              className="p-2 hover:bg-gray-100 rounded"
              title="Underline"
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
              className="p-2 hover:bg-gray-100 rounded"
              title="Align Left"
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
              className="p-2 hover:bg-gray-100 rounded"
              title="Align Center"
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
              className="p-2 hover:bg-gray-100 rounded"
              title="Align Right"
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
      <main className="pt-28 min-h-screen">
        <div className="w-full px-4 sm:px-6 py-6 flex justify-center">
          <div className="w-[80vw] min-h-[calc(100vh-12rem)] bg-white shadow-sm rounded-lg">
            <div
              ref={editorRef}
              contentEditable
              onInput={handleContentChange}
              className="w-full h-full p-6 md:p-8 focus:outline-none text-gray-900 text-base md:text-lg"
              style={{
                fontFamily:
                  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                minHeight: "calc(100vh - 12rem)",
                whiteSpace: "pre-wrap",
                overflowWrap: "break-word",
              }}
              spellCheck="true"
              data-placeholder="Start typing..."
            />
          </div>
        </div>
      </main>
    </div>
  );
};
