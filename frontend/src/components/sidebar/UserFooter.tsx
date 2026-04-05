import { useAuth } from "../../auth/AuthContext";
import { Link } from "react-router-dom";
import { resetSocket } from "../../lib/socket";

export function UserFooter() {
  const { user, logout } = useAuth();

  function handleLogout() {
    resetSocket();
    logout();
    window.location.href = "/login";
  }

  return (
    <div className="h-16 border-t border-gray-700 p-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm">
          {user?.username?.[0].toUpperCase()}
        </div>
        <div className="text-sm">
          <p className="font-medium">{user?.username}</p>
          <p className="text-xs text-gray-400">online</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link
          to="/profile"
          className="text-gray-400 hover:text-white"
        >
          ⚙️
        </Link>
        <button
          onClick={handleLogout}
          className="text-gray-400 hover:text-red-400 transition-colors"
          title="Logout"
        >
          🚪
        </button>
      </div>
    </div>
  );
}
