import React from "react";

interface EditorToolbarProps {
  formatText: (command: string, value?: string) => void;
  formatState: {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    fontSize: string;
    alignment: string;
  };
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  formatText,
  formatState,
}) => {
  return (
    <div className="editor-toolbar">
      <button
        onClick={() => formatText("bold")}
        className={formatState.bold ? "active" : ""}
      >
        B
      </button>
      <button
        onClick={() => formatText("italic")}
        className={formatState.italic ? "active" : ""}
      >
        I
      </button>
      <button
        onClick={() => formatText("underline")}
        className={formatState.underline ? "active" : ""}
      >
        U
      </button>
      <select
        value={formatState.fontSize}
        onChange={(e) => formatText("fontSize", e.target.value)}
      >
        <option value="1">Small</option>
        <option value="3">Normal</option>
        <option value="5">Large</option>
      </select>
      <select
        value={formatState.alignment}
        onChange={(e) => formatText("justify", e.target.value)}
      >
        <option value="left">Left</option>
        <option value="center">Center</option>
        <option value="right">Right</option>
      </select>
    </div>
  );
};

export default EditorToolbar;
