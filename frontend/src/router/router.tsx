import { createBrowserRouter } from "react-router-dom";
import { Login } from "../pages/Login";
import { Register } from "../pages/Register";
import { Profile } from "../pages/Profile";
import { HomePage } from "../pages/Home";
import { IndexLayout } from "../pages/IndexLayout";
import { ChatPage } from "../components/ChatWrapper";
import { AuthorizedGuardLayout } from "../pages/AuthorizedGuardLayout";
import { UnauthorizedGuardLayout } from "../pages/UnauthorizedGuardLayout";
import { ChatLayout } from "../pages/ChatLayout";
import { EmptyChat } from "../pages/EmptyChat";
import { VoiceChannelPage } from "../pages/VoiceChannelPage";

export const router = createBrowserRouter([
  {
    Component: IndexLayout,
    children: [
      { path: "/", element: <HomePage /> },

      {
        Component: UnauthorizedGuardLayout,
        children: [
          { path: "/login", element: <Login /> },
          { path: "/register", element: <Register /> },
        ],
      },

      {
        Component: AuthorizedGuardLayout,
        children: [
          {
            Component: ChatLayout,
            children: [
              { path: "/profile", element: <Profile /> },
              { path: "/chat/:channelId", element: <ChatPage /> },
              { path: "/chat", element: <EmptyChat /> },
              { path: "/voice/:channelId", element: <VoiceChannelPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
