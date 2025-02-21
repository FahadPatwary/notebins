import { Note } from "../types";

export interface SavedNote {
  _id: string;
  title: string;
  content: string;
  noteId: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  isCompressed?: boolean;
  contentLength?: number;
  isNew?: boolean;
}

interface SaveNoteOptions {
  title: string;
  noteId: string;
  content: string;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    try {
      const errorData = await response.json();
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`
      );
    } catch {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
  return response.json();
};

export const noteService = {
  async createNote(content: string): Promise<Note> {
    try {
      const response = await fetch(`${API_URL}/api/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        mode: "cors",
        credentials: "include",
        body: JSON.stringify({ content }),
      });

      return handleResponse(response);
    } catch (error) {
      console.error("Failed to create note:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to create note: ${error.message}`);
      }
      throw new Error("Failed to create note. Please try again.");
    }
  },

  async getNote(id: string): Promise<Note | null> {
    try {
      const response = await fetch(`${API_URL}/api/notes/${id}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        mode: "cors",
        credentials: "include",
      });

      if (response.status === 404) {
        return null;
      }

      return handleResponse(response);
    } catch (error) {
      console.error("Failed to get note:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to get note: ${error.message}`);
      }
      throw new Error("Failed to get note. Please try again.");
    }
  },

  async updateNote(id: string, content: string): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/api/notes/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        mode: "cors",
        credentials: "include",
        body: JSON.stringify({ content }),
      });

      await handleResponse(response);
    } catch (error) {
      console.error("Failed to update note:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to update note: ${error.message}`);
      }
      throw new Error("Failed to update note. Please try again.");
    }
  },

  async checkExistingNote(noteId: string): Promise<SavedNote | null> {
    try {
      const response = await fetch(
        `${API_URL}/api/saved-notes/check/${noteId}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          mode: "cors",
          credentials: "include",
        }
      );

      if (response.status === 404) {
        return null;
      }

      return handleResponse(response);
    } catch (error) {
      console.error("Failed to check existing note:", error);
      return null;
    }
  },

  async saveNoteToLibrary({
    title,
    noteId,
    content,
  }: SaveNoteOptions): Promise<SavedNote> {
    try {
      const response = await fetch(`${API_URL}/api/saved-notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        mode: "cors",
        credentials: "include",
        body: JSON.stringify({
          title,
          noteId,
          content,
          url: window.location.href,
        }),
      });

      const result = await handleResponse(response);

      // If this was an update (status 200) or new creation (status 201)
      if (response.status === 200 || response.status === 201) {
        return result;
      }

      throw new Error("Unexpected response from server");
    } catch (error) {
      console.error("Failed to save note to library:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to save note to library: ${error.message}`);
      }
      throw new Error("Failed to save note to library. Please try again.");
    }
  },

  async getSavedNotes(): Promise<SavedNote[]> {
    try {
      const response = await fetch(`${API_URL}/api/saved-notes`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        mode: "cors",
        credentials: "include",
      });

      return handleResponse(response);
    } catch (error) {
      console.error("Failed to get saved notes:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to get saved notes: ${error.message}`);
      }
      throw new Error("Failed to get saved notes. Please try again.");
    }
  },

  async deleteSavedNote(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/api/saved-notes/${id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
        mode: "cors",
        credentials: "include",
      });

      if (response.status !== 204) {
        await handleResponse(response);
      }
    } catch (error) {
      console.error("Failed to delete saved note:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to delete saved note: ${error.message}`);
      }
      throw new Error("Failed to delete saved note. Please try again.");
    }
  },
};
