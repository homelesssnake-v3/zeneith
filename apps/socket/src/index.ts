import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import { PrismaClient } from "@repo/prisma/client";

const prisma = new PrismaClient();
const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3001",
    credentials: true,
  },
});

export const userSocketMap: Record<string, string> = {};

interface MessageData {
  id: string;
  toPhone: string;
  fromPhone: string;
  message: string;
  type: string;
  timestamp: Date;
  time: string;
  imageUrl?: string;
  imageCaption?: string;
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("register", (phone: string) => {
    if (phone) {
      userSocketMap[phone] = socket.id;
      console.log(`✅ User ${phone} registered with socket ID ${socket.id}`);
      console.log("📋 Current online users:", Object.keys(userSocketMap));

      io.emit("user-status", {number: phone, status: "online"});
    }
  });

  socket.on("delivered", (data: MessageData) => {
    const senderSocketId = userSocketMap[data.fromPhone];
    
    if(senderSocketId){
      console.log("Emitting ack-delivered to", senderSocketId);
      io.to(senderSocketId).emit("ack-delivered", data);
    }
  });

  socket.on("online", (data: {number: string, sender: string}) => {
    console.log(`🔍 Online check request from ${data.sender} asking about ${data.number}`);
    
    const senderSocketId = userSocketMap[data.sender];
    const receiverSocketId = userSocketMap[data.number];
    const online = !!receiverSocketId; // Convert to boolean
    
    console.log(`📱 ${data.number} socket ID:`, receiverSocketId || "NOT FOUND");
    console.log(`👤 ${data.number} is ${online ? "ONLINE" : "OFFLINE"}`);
    console.log("📋 All registered users:", Object.keys(userSocketMap));
    
    if(senderSocketId){
      const responseData = {number: data.number, online: online};
      console.log("📤 Sending online status response:", responseData);
      io.to(senderSocketId).emit("online", responseData);
    } else {
      console.log("❌ Sender socket not found for:", data.sender);
    }
  });



 
 socket.on("friendreload", (data: {number: string}) => {
  const socketId = userSocketMap[data.number];
  if(!socketId){return;}
  io.to(socketId).emit("friendreload");
 });


  socket.on("message", async (data: MessageData) => {
    try {
      const createdMessage = await prisma.chats.create({
        data: {
          id: data.id,
          toPhone: data.toPhone,
          fromPhone: data.fromPhone,
          message: data.message,
          type: data.type,
          imageUrl: data.imageUrl,
          imageCaption: data.imageCaption,
          timestamp: data.timestamp,
          time: data.time,
          status: "pending",
        },
      });

      const recipientSocketId = userSocketMap[data.toPhone];
      if (recipientSocketId) {
        const deliveredMessage = await prisma.chats.update({
          where: { id: createdMessage.id },
          data: { status: "delivered" },
        });

        const senderSocketId = userSocketMap[data.fromPhone];
        if (senderSocketId) {
          io.to(senderSocketId).emit("ack-delivered", deliveredMessage);
        }
        io.to(recipientSocketId).emit("message", createdMessage);
      }
    } catch (error) {
      console.error("Failed to process message:", error);
    }
  });

  socket.on("ack-seen", async (msg: MessageData) => {
    try {
      const message = await prisma.chats.findUnique({ where: { id: msg.id } });
      if (message) {
        const updatedMessage = await prisma.chats.update({
          where: { id: msg.id },
          data: { status: "seen" },
        });
        const senderSocketId = userSocketMap[message.fromPhone];
        if (senderSocketId) {
          io.to(senderSocketId).emit("ack-seen", updatedMessage);
        }
      }
    } catch(error){
      console.error("Failed to process ack-seen:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnecting:", socket.id);
    for (const phone in userSocketMap) {
      if (userSocketMap[phone] === socket.id) {
        io.emit("user-status", {number: phone, status: "offline"});
        delete userSocketMap[phone];
        console.log(`❌ User ${phone} disconnected and removed from online users`);
        console.log("📋 Remaining online users:", Object.keys(userSocketMap));
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);