"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, ArrowLeft, Clock, Check, CheckCheck } from "lucide-react";
import { useSession } from "next-auth/react";
import { useSelector, useDispatch } from "react-redux";
import { setUsers } from "@repo/redux/slices/userslice";
import useSocket from "./Socketcontext";
import { nanoid } from "nanoid";

interface MessageData {
  id: string;
  toPhone: string;
  fromPhone: string;
  message: string;
  imageUrl?: string;
  imageCaption?: string;
  type: string;
  time: string;
  timestamp: Date;
  status: "seen" | "delivered" | "pending";
}

const MessageStatus = ({ status }: { status: string }) => {
  switch (status) {
    case "seen":
      return <CheckCheck size={16} className="text-blue-500" />;
    case "delivered":
      return <CheckCheck size={16} className="text-white-500" />;
    case "pending":
      return <Check size={16} className="text-gray-500" />;
    default:
      return null;
  }
};

export default function ChatCard({
  person,
  setMessageclicked,
  online,
  setOnline,
  setQuery,
  setFriendRefresh,
}: {
  person: any;
  setMessageclicked: (clicked: boolean) => void;
  online: boolean;
  setOnline: (online: boolean) => void;
  setQuery: (query: string) => void;
  setFriendRefresh: (refresh: boolean | ((prev: boolean) => boolean)) => void;
}) {
  const recipient = person || {
    id: 2,
    name: "Alice",
    number: "0987654321",
    imageUrl: "https://placehold.co/100x100/ec4899/FFFFFF?text=A",
    online: true,
  };

  const { data: session } = useSession();
  const dispatch = useDispatch();
  const user = useSelector((state: any) => state.user.user);
  const socket = useSocket();
  

  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [newmsg, setNewmsg] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Handle session data
  useEffect(() => {
    if (session?.user) {
      dispatch(setUsers(session.user as any));
    }
  }, [session, dispatch]);

  // Set up socket event listeners (including online status)
  useEffect(() => {
    if (!socket || !user?.number) return;

 

    const handleNewMessage = (data: MessageData) => {
      if (data.fromPhone === recipient.number) {
        socket.emit("ack-seen", data);
      }
      const seenmsg = { ...data, status: "seen" as const };
      setMessages((prev) => {
        const messageExists = prev.some((msg) => msg.id === data.id);
        if (messageExists) return prev;
        return [...prev, seenmsg];
      });
    };

    const handleAckDelivered = (data: MessageData) => {
      console.log("Delivered received:", data);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.id ? { ...msg, status: "delivered" as const } : msg
        )
      );
    };

    const handleAckSeen = (data: MessageData) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.id ? { ...msg, status: "seen" as const } : msg
        )
      );
    };



    // Register all event listeners
   
    socket.on("message", handleNewMessage);
    socket.on("ack-delivered", handleAckDelivered);
    socket.on("ack-seen", handleAckSeen);
    

    return () => {
    
    
      socket.off("message", handleNewMessage);
      socket.off("ack-delivered", handleAckDelivered);
      socket.off("ack-seen", handleAckSeen);
          
    };
  }, [socket, user?.number, recipient.number]);

  // Fetch chat history and check online status
  useEffect(() => {
    if (!socket || !user?.number) return;

    async function initializeChat() {
      try {
        setLoading(true);
        
        // Fetch chat history
        const chats = await fetch(`/api/chat?personNumber=${recipient.number}`)
          .then((res) => res.json());
        
        // Mark messages as seen
        chats.forEach((chat: MessageData) => {
          if (chat.fromPhone === recipient.number && chat.status !== "seen") {
            socket?.emit("ack-seen", chat);
            chat.status = "seen" as const;
          }
        });
        
        setMessages(chats);
        setNewmsg(!newmsg);
        
        // Check online status AFTER socket is set up and registered
 // Small delay to ensure registration is complete
        
      } catch (error) {
        console.error("Error initializing chat:", error);
      } finally {
        setLoading(false);
      }
    }

    initializeChat();
  }, [socket, user?.number, recipient.number]);

  // Auto-scroll effect
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [newmsg]);

  const handleSendMessage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedMessage = newMessage.trim();
    
    if (!trimmedMessage || !socket || !user?.number) return;

    const now = new Date();
    const message: MessageData = {
      id: nanoid(),
      toPhone: recipient.number,
      fromPhone: user.number,
      message: trimmedMessage,
      type: "text",
      timestamp: now,
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "pending",
      imageUrl: "",
      imageCaption: "",
    };

    // Optimistically update UI
    setMessages((prev) => [...prev, message]);
    setNewMessage("");
    setNewmsg((prev) => !prev);

    // Emit the message
    socket.emit("message", message);
    socket.emit("friendreload", {number: recipient.number});
   
  };

  return (
    <div className="absolute inset-0 flex z-1000 flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center p-4 border-b border-gray-200 bg-gray-50 z-10">
        <button className="p-2 rounded-full hover:bg-gray-200 transition mr-3">
          <ArrowLeft
            className="h-6 w-6 text-gray-600"
            onClick={() => {setMessageclicked(false); setFriendRefresh((prev) => !prev)  }}
          />
        </button>
        <img
          src={recipient.imageUrl}
          alt={recipient.name}
          className="h-10 w-10 rounded-full object-cover"
        />
        <div className="ml-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {recipient.name}
          </h2>
          <p className={`text-sm ${online ? "text-green-500" : "text-gray-400"}`}>
            {online ? "Online" : "Offline"}
          </p>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-100">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isSentByCurrentUser = msg.fromPhone === user?.number;
              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${isSentByCurrentUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs md:max-w-md px-4 py-3 rounded-2xl ${isSentByCurrentUser ? "bg-indigo-600 text-white rounded-br-none" : "bg-white text-gray-800 shadow-sm rounded-bl-none"}`}
                  >
                    <p className="text-sm break-words">{msg.message}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <p
                        className={`text-xs ${isSentByCurrentUser ? "text-indigo-100" : "text-gray-400"}`}
                      >
                        {msg.time}
                      </p>
                      {isSentByCurrentUser && (
                        <MessageStatus status={msg.status} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Message Input Footer */}
      <footer className="p-4 bg-white border-t border-gray-200">
        <form
          onSubmit={handleSendMessage}
          className="flex items-center space-x-3"
        >
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 w-full px-4 py-2.5 bg-gray-100 text-gray-800 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            autoComplete="off"
          />
          <button
            type="submit"
            className="bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-transform duration-150 active:scale-95 disabled:bg-indigo-300"
            disabled={!newMessage.trim()}
          >
            <Send className="h-6 w-6" />
          </button>
        </form>
      </footer>
    </div>
  );
}