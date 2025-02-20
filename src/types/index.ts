export interface Note {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NoteUpdate {
  content: string;
  noteId: string;
}

export interface SocketEvents {
  "note:update": (update: NoteUpdate) => void;
  "note:join": (noteId: string) => void;
  "note:leave": (noteId: string) => void;
}
