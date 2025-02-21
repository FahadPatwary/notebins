import type { Socket } from "socket.io-client";
import { io } from "socket.io-client";
import { NoteUpdate } from "../types";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:10000";
const RECONNECTION_ATTEMPTS = 5;
const RECONNECTION_DELAY = 1000;
const MAX_RECONNECTION_DELAY = 5000;
const DEBOUNCE_TIME = 300; // 300ms debounce for updates
const CONNECTION_TIMEOUT = 10000; // 10s connection timeout

class SocketService {
  private socket: Socket;
  private static instance: SocketService;
  private updateTimeout: NodeJS.Timeout | null = null;
  private pendingUpdate: NoteUpdate | null = null;
  private isReconnecting: boolean = false;
  private reconnectionAttempts: number = 0;

  private constructor() {
    this.socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnectionDelay: RECONNECTION_DELAY,
      reconnectionDelayMax: MAX_RECONNECTION_DELAY,
      reconnectionAttempts: RECONNECTION_ATTEMPTS,
      withCredentials: true,
      forceNew: true,
      timeout: CONNECTION_TIMEOUT,
      autoConnect: false, // We'll handle connection manually
    });

    this.connect();
    this.setupSocketListeners();
  }

  private connect() {
    if (!this.socket.connected && !this.isReconnecting) {
      this.socket.connect();
    }
  }

  private setupSocketListeners() {
    this.socket.on("connect", () => {
      console.log("Connected to socket server");
      this.isReconnecting = false;
      this.reconnectionAttempts = 0;

      // Clear any existing reconnection timers
      if (this.reconnectionTimer) {
        clearTimeout(this.reconnectionTimer);
        this.reconnectionTimer = null;
      }

      // Resend pending update if any
      if (this.pendingUpdate) {
        this.updateNote(this.pendingUpdate);
      }
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      this.handleReconnection();
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Disconnected from socket server:", reason);
      if (reason === "io server disconnect") {
        // Server disconnected explicitly
        this.socket.connect();
      }
    });

    this.socket.on("error", (error) => {
      console.error("Socket error:", error);
      this.handleReconnection();
    });

    // Add ping/pong for connection health check
    this.socket.on("ping", () => {
      this.socket.emit("pong");
    });
  }

  private reconnectionTimer: NodeJS.Timeout | null = null;

  private handleReconnection() {
    if (this.isReconnecting) return;

    this.isReconnecting = true;
    this.reconnectionAttempts++;

    if (this.reconnectionAttempts <= RECONNECTION_ATTEMPTS) {
      const delay = Math.min(
        RECONNECTION_DELAY * Math.pow(2, this.reconnectionAttempts - 1),
        MAX_RECONNECTION_DELAY
      );

      console.log(
        `Attempting to reconnect... Attempt ${this.reconnectionAttempts}/${RECONNECTION_ATTEMPTS} (delay: ${delay}ms)`
      );

      // Clear any existing timer
      if (this.reconnectionTimer) {
        clearTimeout(this.reconnectionTimer);
      }

      // Set up new reconnection attempt
      this.reconnectionTimer = setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error("Max reconnection attempts reached");
      // Emit event for UI to handle
      this.socket.emit("maxReconnectAttempts");
    }
  }

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public joinNote(noteId: string) {
    if (this.socket.connected) {
      this.socket.emit("note:join", noteId);
    } else {
      this.socket.connect();
      this.socket.once("connect", () => {
        this.socket.emit("note:join", noteId);
      });
    }
  }

  public leaveNote(noteId: string) {
    this.socket.emit("note:leave", noteId);
    this.pendingUpdate = null;
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
    }
  }

  public updateNote(update: NoteUpdate) {
    this.pendingUpdate = update;

    // Clear existing timeout
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    // Debounce the update
    this.updateTimeout = setTimeout(() => {
      if (this.socket.connected && this.pendingUpdate) {
        this.socket.emit("note:update", this.pendingUpdate);
        this.pendingUpdate = null;
      }
    }, DEBOUNCE_TIME);
  }

  public onNoteUpdate(callback: (update: NoteUpdate) => void) {
    this.socket.on("note:update", callback);
  }

  public offNoteUpdate(callback: (update: NoteUpdate) => void) {
    this.socket.off("note:update", callback);
  }

  public disconnect() {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    this.pendingUpdate = null;
    this.socket.disconnect();
  }

  public reconnect() {
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  public getConnectionStatus(): boolean {
    return this.socket.connected;
  }
}

export const socketService = SocketService.getInstance();
