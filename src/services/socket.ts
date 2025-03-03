import type { Socket } from "socket.io-client";
import { io } from "socket.io-client";
import { NoteUpdate } from "../types";

const SOCKET_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://notebinsbackendserver.azurewebsites.net" : "http://localhost:10000");
const RECONNECTION_ATTEMPTS = 10;
const DEBOUNCE_TIME = 300; // 300ms debounce for updates

class SocketService {
  private socket: Socket;
  private static instance: SocketService;
  private updateTimeout: NodeJS.Timeout | null = null;
  private pendingUpdate: NoteUpdate | null = null;
  private isReconnecting: boolean = false;
  private reconnectionAttempts: number = 0;

  private constructor() {
    this.socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: RECONNECTION_ATTEMPTS,
      withCredentials: true,
      forceNew: true,
      timeout: 10000,
    });

    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    this.socket.on("connect", () => {
      console.log("Connected to socket server");
      this.isReconnecting = false;
      this.reconnectionAttempts = 0;

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

  private handleReconnection() {
    if (
      !this.isReconnecting &&
      this.reconnectionAttempts < RECONNECTION_ATTEMPTS
    ) {
      this.isReconnecting = true;
      this.reconnectionAttempts++;

      setTimeout(() => {
        console.log(
          `Attempting to reconnect... (${this.reconnectionAttempts}/${RECONNECTION_ATTEMPTS})`
        );
        this.socket.connect();
      }, Math.min(1000 * this.reconnectionAttempts, 5000));
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
