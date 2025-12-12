// frontend/src/App.tsx
import React, { useState } from "react";

function App() {
  // State for active server and channel
  const [activeServer, setActiveServer] = useState("A");
  const [activeChannel, setActiveChannel] =
    useState("general");
  const [messages, setMessages] = useState([
    {
      id: 1,
      username: "Anna Kowalska",
      time: "Today 14:30",
      avatar: "A",
      content: "Hello everyone! How's the project going?",
    },
    {
      id: 2,
      username: "John Smith",
      time: "Today 14:32",
      avatar: "J",
      content:
        "Going well! Just finished setting up the frontend with Vite and Tailwind v4 ⚡",
    },
    {
      id: 3,
      username: "Kajetan Kacprzyk",
      time: "Today 14:33",
      avatar: "KK",
      content:
        "Great! Everything works responsively and the colors are perfectly matched 🎨",
    },
  ]);

  // Mock data for servers
  const servers = [
    { id: "A", name: "Gaming", icon: "A" },
    { id: "B", name: "Study", icon: "B" },
    { id: "C", name: "Music", icon: "C" },
    { id: "D", name: "Movies", icon: "D" },
  ];

  // Mock data for text channels
  const textChannels = [
    { id: "general", name: "general" },
    { id: "main-chat", name: "main-chat" },
    { id: "help", name: "help" },
  ];

  // Mock data for voice channels
  const voiceChannels = [
    { id: "general-voice", name: "General" },
    { id: "gaming-voice", name: "Gaming" },
    { id: "study-voice", name: "Study" },
  ];

  return (
    <div className="h-screen flex bg-app-bg text-app-text-primary">
      {/* Left sidebar - servers list */}
      <div className="w-16 bg-app-header flex flex-col items-center py-3 space-y-2">
        {servers.map((server) => (
          <div
            key={server.id}
            className={`server-icon ${
              activeServer === server.id ? "active" : ""
            }`}
            onClick={() => setActiveServer(server.id)}
            title={server.name}
          >
            {server.icon}
          </div>
        ))}
        {/* Add server button */}
        <div className="server-icon" title="Add server">
          +
        </div>
      </div>

      {/* Middle sidebar - channels list */}
      <div className="w-60 bg-app-sidebar flex flex-col">
        {/* Server header */}
        <div className="p-4 border-b border-app-header">
          <h1 className="font-bold text-lg">
            {servers.find((s) => s.id === activeServer)
              ?.name || "Server"}
          </h1>
        </div>

        {/* Channels list */}
        <div className="flex-1 overflow-y-auto p-2">
          {/* Text channels section */}
          <div className="category">TEXT CHANNELS</div>
          {textChannels.map((channel) => (
            <div
              key={channel.id}
              className={`channel ${
                activeChannel === channel.id ? "active" : ""
              }`}
              onClick={() => setActiveChannel(channel.id)}
            >
              # {channel.name}
            </div>
          ))}

          {/* Voice channels section */}
          <div className="category mt-4">
            VOICE CHANNELS
          </div>
          {voiceChannels.map((channel) => (
            <div
              key={channel.id}
              className="channel"
              onClick={() => setActiveChannel(channel.id)}
            >
              🔊 {channel.name}
            </div>
          ))}
        </div>

        {/* User profile section */}
        <div className="p-2 bg-app-header">
          <div className="flex items-center space-x-2 p-2 rounded hover:bg-app-bg cursor-pointer">
            <div className="w-8 h-8 bg-app-primary rounded-full flex items-center justify-center text-white font-bold text-sm">
              KK
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                Kajetan Kacprzyk
              </div>
              <div className="text-xs text-app-text-muted">
                #1234
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main area - chat */}
      <div className="flex-1 flex flex-col">
        {/* Channel header */}
        <div className="h-12 border-b border-app-sidebar px-4 flex items-center">
          <div className="text-app-text-secondary mr-2">
            #
          </div>
          <div className="font-semibold">
            {activeChannel}
          </div>
        </div>

        {/* Messages container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <Message
              key={message.id}
              username={message.username}
              time={message.time}
              avatar={message.avatar}
              content={message.content}
            />
          ))}
        </div>

        {/* Message input */}
        <div className="p-4 border-t border-app-sidebar">
          <div className="bg-app-sidebar rounded-lg px-4">
            <input
              type="text"
              placeholder={`Message #${activeChannel}`}
              className="w-full bg-transparent py-3 outline-none text-app-text-primary placeholder-app-text-muted"
              onKeyPress={(e) => {
                // Handle sending message on Enter key
                if (e.key === "Enter") {
                  const input =
                    e.target as HTMLInputElement;
                  if (input.value.trim()) {
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: prev.length + 1,
                        username: "kajetan.kacprzyk",
                        time: "Now",
                        avatar: "KK",
                        content: input.value,
                      },
                    ]);
                    input.value = ""; // Clear input after sending
                  }
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Message component interface
interface MessageProps {
  username: string;
  time: string;
  avatar: string;
  content: string;
}

// Individual message component
function Message({
  username,
  time,
  avatar,
  content,
}: MessageProps) {
  return (
    <div className="flex space-x-3 hover:bg-app-sidebar px-3 py-1 rounded">
      {/* User avatar */}
      <div className="w-10 h-10 bg-app-primary rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
        {avatar}
      </div>

      {/* Message content */}
      <div className="flex-1 min-w-0">
        {/* Message header with username and timestamp */}
        <div className="flex items-baseline space-x-2">
          <span className="font-semibold text-app-text-primary hover:underline cursor-pointer">
            {username}
          </span>
          <span className="text-xs text-app-text-muted">
            {time}
          </span>
        </div>

        {/* Message text */}
        <p className="text-app-text-secondary mt-1">
          {content}
        </p>
      </div>
    </div>
  );
}

export default App;
