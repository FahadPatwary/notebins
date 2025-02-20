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
    });

    this.socket.on("connect", () => {
      console.log("Connected to socket server");
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from socket server");
    });
  }

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public joinNote(noteId: string) {
    this.socket.emit("note:join", noteId);
  }

  public leaveNote(noteId: string) {
    this.socket.emit("note:leave", noteId);
  }

  public updateNote(update: NoteUpdate) {
    this.socket.emit("note:update", update);
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
}

export const socketService = SocketService.getInstance();
