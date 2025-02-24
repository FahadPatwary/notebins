import React, { useEffect, useRef } from "react";

interface EditorAreaProps {
  content: string;
  setContent: (content: string) => void;
  handleContentChange: () => void;
}

const EditorArea: React.FC<EditorAreaProps> = ({
  content,
  setContent,
  handleContentChange,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = content;
    }
  }, [content]);

  const handleInput = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
      handleContentChange();
    }
  };

  return (
    <div
      ref={editorRef}
      contentEditable
      onInput={handleInput}
      className="editor-area"
    />
  );
};

export default EditorArea;
