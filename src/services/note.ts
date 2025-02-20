import { Note } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    try {
      const errorData = await response.json();
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`
      );
    } catch (e) {
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
};
