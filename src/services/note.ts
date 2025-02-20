import { Note } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export const noteService = {
  async createNote(content: string): Promise<Note> {
    const response = await fetch(`${API_URL}/api/notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error("Failed to create note");
    }

    return response.json();
  },

  async getNote(id: string): Promise<Note | null> {
    const response = await fetch(`${API_URL}/api/notes/${id}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error("Failed to get note");
    }

    return response.json();
  },

  async updateNote(id: string, content: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/notes/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error("Failed to update note");
    }
  },
};
