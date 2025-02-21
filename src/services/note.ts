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

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://notebinsbackend.onrender.com" : "http://localhost:10000");

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const CACHE_DURATION = 5000; // 5 seconds
const REQUEST_TIMEOUT = 30000; // 30 seconds
const QUEUE_TIMEOUT = 10000; // 10 seconds

// Request queue to prevent concurrent requests to the same resource
const requestQueue = new Map<string, Promise<any>>();

// Cache for note data
const noteCache = new Map<string, { data: Note; timestamp: number }>();

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Queue management
const addToQueue = async <T>(key: string, operation: () => Promise<T>): Promise<T> => {
  const existingRequest = requestQueue.get(key);
  if (existingRequest) {
    try {
      return await existingRequest as Promise<T>;
    } catch (error) {
      // If existing request fails, remove it and try again
      requestQueue.delete(key);
    }
  }

  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Request timeout')), QUEUE_TIMEOUT);
  });

  const request = Promise.race([
    operation(),
    timeoutPromise
  ]).finally(() => {
    clearTimeout(timeoutId!);
    requestQueue.delete(key);
  });

  requestQueue.set(key, request);
  return request;
};

// Cache management
const getCachedNote = (id: string): Note | null => {
  const cached = noteCache.get(id);
  if (!cached) return null;

  const now = Date.now();
  if (now - cached.timestamp > CACHE_DURATION) {
    noteCache.delete(id);
    return null;
  }

  return cached.data;
};

const cacheNote = (note: Note) => {
  noteCache.set(note.id, {
    data: note,
    timestamp: Date.now()
  });
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    let errorMessage = `Request failed! status: ${response.status}`;
    
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } else {
        const textError = await response.text();
        if (textError) {
          errorMessage = textError;
        }
      }
    } catch (error) {
      console.error('Error parsing error response:', error);
    }

    if (response.status >= 500) {
      throw new Error(`Server error! status: ${response.status}. Please try again in a few minutes.`);
    } else if (response.status === 429) {
      throw new Error('Too many requests. Please wait a moment and try again.');
    } else if (response.status === 401) {
      throw new Error('Authentication required. Please log in again.');
    } else if (response.status === 413) {
      throw new Error('Content too large. Please reduce the size and try again.');
    } else {
      throw new Error(errorMessage);
    }
  }

  try {
    return await response.json();
  } catch (error) {
    console.error('Error parsing response:', error);
    throw new Error('Invalid response from server. Please try again.');
  }
};

const fetchWithRetry = async (url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    // Don't retry for these status codes
    if (response.status === 401 || response.status === 403 || response.status === 404) {
      return response;
    }
    
    if (!response.ok && retries > 0) {
      const delay = RETRY_DELAY * Math.pow(2, MAX_RETRIES - retries); // Exponential backoff
      await wait(delay);
      return fetchWithRetry(url, options, retries - 1);
    }
    
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }

    if (retries > 0) {
      const delay = RETRY_DELAY * Math.pow(2, MAX_RETRIES - retries); // Exponential backoff
      await wait(delay);
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const noteService = {
  async createNote(content: string): Promise<Note> {
    if (!content || content.trim().length === 0) {
      throw new Error('Note content cannot be empty');
    }

    try {
      // Validate content size (rough estimate)
      const contentSize = new Blob([content]).size;
      if (contentSize > 5 * 1024 * 1024) { // 5MB limit
        throw new Error('Note content is too large. Maximum size is 5MB.');
      }

      const response = await fetchWithRetry(`${API_URL}/api/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        mode: "cors",
        credentials: "include",
        body: JSON.stringify({ 
          content,
          timestamp: new Date().toISOString() // Add timestamp for debugging
        }),
      });

      return handleResponse(response);
    } catch (error) {
      console.error("Failed to create note:", error);
      if (error instanceof Error) {
        // Don't wrap error message if it's already meaningful
        if (error.message.includes('Note content') || 
            error.message.includes('Server error') || 
            error.message.includes('Too many requests')) {
          throw error;
        }
        throw new Error(`Failed to create note: ${error.message}`);
      }
      throw new Error("Failed to create note. Please try again.");
    }
  },

  async getNote(id: string): Promise<Note | null> {
    return addToQueue(`note-${id}`, async () => {
      // Check cache first
      const cached = getCachedNote(id);
      if (cached) {
        console.log("Returning cached note:", id);
        return cached;
      }

      try {
        console.log('Fetching note from API:', id);
        
        const response = await fetchWithRetry(`${API_URL}/api/notes/${id}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          mode: "cors",
          credentials: "include",
        });

        // For 404, try to get the error message from the response
        if (response.status === 404) {
          try {
            const errorData = await response.json();
            console.log('Note not found:', errorData.message);
          } catch (error) {
            console.error('Error parsing 404 response:', error);
          }
          return null;
        }

        // For other errors
        if (!response.ok) {
          let errorMessage = `HTTP error! status: ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch (error) {
            console.error('Error parsing error response:', error);
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        const note: Note = {
          id: data.id,
          content: data.content,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };

        // Cache the note
        cacheNote(note);
        return note;
      } catch (error) {
        console.error('Error fetching note:', error);
        throw error instanceof Error ? error : new Error('Failed to fetch note');
      }
    });
  }

      throw error;
    }
  },

  async updateNote(id: string, content: string): Promise<void> {
    try {
      const response = await fetchWithRetry(`${API_URL}/api/notes/${id}`, {
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
      const response = await fetchWithRetry(
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

      const response = await fetchWithRetry(`${API_URL}/api/saved-notes`, {
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
      const response = await fetchWithRetry(`${API_URL}/api/saved-notes`, {
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

      const response = await fetchWithRetry(`${API_URL}/api/saved-notes/${id}`, {
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
