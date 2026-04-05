import { Outlet } from "react-router";
import { ChannelList } from "../components/sidebar/ChannelList";
import { UserFooter } from "../components/sidebar/UserFooter";

export function ChatLayout() {
  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <aside className="w-60 flex flex-col border-r border-gray-700 shrink-0">
        <div className="p-3 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-white">My Server</h2>
        </div>

        {/* Channel list fills remaining space */}
        <div className="flex-1 overflow-y-auto py-2">
          <ChannelList />
        </div>

        {/* Logged-in user footer */}
        <UserFooter />
      </aside>

      {/* Main area */}
      <section className="flex-1 overflow-hidden">
        <Outlet />
      </section>
    </div>
  );
}
