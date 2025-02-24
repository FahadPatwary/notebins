import React from "react";

interface SaveDialogProps {
  isOpen: boolean;
  title: string;
  password: string;
  showPassword: boolean;
  error: string;
  onClose: () => void;
  onSave: (title: string, password: string) => void;
}

const SaveDialog: React.FC<SaveDialogProps> = ({
  isOpen,
  title,
  password,
  showPassword,
  error,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  return (
    <div className="save-dialog">
      <h2>Save Note</h2>
      <input
        type="text"
        value={title}
        onChange={(e) => onSave(e.target.value, password)}
        placeholder="Title"
      />
      <input
        type={showPassword ? "text" : "password"}
        value={password}
        onChange={(e) => onSave(title, e.target.value)}
        placeholder="Password"
      />
      {error && <p className="error">{error}</p>}
      <button onClick={onClose}>Cancel</button>
      <button onClick={() => onSave(title, password)}>Save</button>
    </div>
  );
};

export default SaveDialog;
