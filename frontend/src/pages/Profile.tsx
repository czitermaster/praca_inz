import { useAuth } from "../auth/AuthContext";

export function Profile() {
  const { user, loading, error } = useAuth();

  if (loading) return <div>Loading profile...</div>;

  if (error) {
    return (
      <div className="text-red-500">
        Error:{" "}
        {error instanceof Error
          ? error.message
          : "Unknown error"}
      </div>
    );
  }

  if (!user) return <div>No user found</div>;

  console.debug(user);

  return (
    <div className="flex flex-col items-center p-4 bg-gray-800 text-white rounded-md">
      <h2 className="text-xl font-bold mb-2">
        Welcome, {user.username}
      </h2>
      <p className="text-gray-300 mb-2">
        Email: {user.email}
      </p>
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt="Avatar"
          className="w-20 h-20 rounded-full object-cover"
        />
      ) : (
        <div className="w-20 h-20 rounded-full bg-gray-600 flex items-center justify-center text-2xl">
          {user.username.toUpperCase()}
        </div>
      )}
    </div>
  );
}
