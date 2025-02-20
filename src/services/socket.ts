import type { Socket } from "socket.io-client";
import { io } from "socket.io-client";
import { NoteUpdate } from "../types";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

class SocketService {
  private socket: Socket;
  private static instance: SocketService;

  private constructor() {
    this.socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      withCredentials: true,
      forceNew: true,
      timeout: 10000,
    });

    this.socket.on("connect", () => {
      console.log("Connected to socket server");
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from socket server");
    });

    this.socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
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
  }

  public updateNote(update: NoteUpdate) {
    if (this.socket.connected) {
      this.socket.emit("note:update", update);
    }
  }

  public onNoteUpdate(callback: (update: NoteUpdate) => void) {
    this.socket.on("note:update", callback);
  }

  public offNoteUpdate(callback: (update: NoteUpdate) => void) {
    this.socket.off("note:update", callback);
  }

  public disconnect() {
    this.socket.disconnect();
  }

  public reconnect() {
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }
}

export const socketService = SocketService.getInstance();
