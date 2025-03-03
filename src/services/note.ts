import { Note } from "../types";

export interface SavedNote {
  _id: string;
  title: string;
  content: string;
  noteId: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  contentLength: number;
  isCompressed: boolean;
  isPasswordProtected: boolean;
  isNew?: boolean;
}

interface SaveNoteParams {
  title: string;
  noteId: string;
  content: string;
  password?: string;
}

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://notebinsbackendserver.azurewebsites.net" : "http://localhost:10000");

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
      console.log('Fetching note from API:', id);
      
      const response = await fetch(`${API_URL}/api/notes/${id}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          'Content-Type': 'application/json',
        },
        mode: "cors",
        credentials: "include",
      });

      // For 404, try to get the error message from the response
      if (response.status === 404) {
        try {
          const errorData = await response.json();
          console.log('Note not found:', errorData.message);
        } catch {}
        return null;
      }

      // For other errors
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {}
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Validate note data
      if (!data || !data.id || typeof data.content !== 'string') {
        console.error('Invalid note data:', data);
        return null;
      }

      return {
        id: data.id,
        content: data.content,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
    } catch (error) {
      console.error("Failed to get note:", error);
      throw error;
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

  async saveNoteToLibrary(params: SaveNoteParams): Promise<SavedNote> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      // Add password header if provided
      if (params.password) {
        headers["X-Note-Password"] = params.password;
      }

      // Add URL to params
      const url = window.location.href;
      const paramsWithUrl = { ...params, url };

      const response = await fetch(`${API_URL}/api/saved-notes`, {
        method: "POST",
        headers,
        mode: "cors",
        credentials: "include",
        body: JSON.stringify(paramsWithUrl),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save note");
      }

      return response.json();
    } catch (error) {
      console.error("Error saving note to library:", error);
      throw error;
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

  async deleteSavedNote(id: string, password?: string): Promise<void> {
    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
      };

      if (password) {
        headers["X-Note-Password"] = password;
      }

      const response = await fetch(`${API_URL}/api/saved-notes/${id}`, {
        method: "DELETE",
        headers,
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
