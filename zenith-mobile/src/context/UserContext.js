import React, { createContext, useState, useEffect, useContext, useCallback } from "react";
import { useAuth } from "@clerk/clerk-expo";
import { fetchUser, createUser, setAuthToken } from "../services/api";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const { isSignedIn, getToken, userId } = useAuth();
  const [user, setUser] = useState(null);

  // Refresh the Clerk JWT and attach it to every future axios request.
  // Clerk caches the token and only hits the network when it's close to expiry.
  const refreshToken = useCallback(async () => {
    const token = await getToken();
    setAuthToken(token);
    return token;
  }, [getToken]);

  const loadUser = useCallback(async () => {
    if (!userId) return;
    try {
      await refreshToken();
      const res = await fetchUser(userId);
      setUser(res.data);
    } catch (err) {
      // 404 means the user exists in Clerk but not in our DB yet — create them
      if (err.response?.status === 404) {
        try {
          await createUser({ username: userId, email: "" });
          const res = await fetchUser(userId);
          setUser(res.data);
        } catch (createErr) {
          console.error("[UserContext] createUser failed:", createErr.message);
        }
      } else {
        console.error("[UserContext] loadUser failed:", err.message);
      }
    }
  }, [userId, refreshToken]);

  useEffect(() => {
    if (isSignedIn && userId) {
      loadUser();
    } else {
      setUser(null);
      setAuthToken(null);
    }
  }, [isSignedIn, userId]);

  return (
    <UserContext.Provider value={{ user, fetchUser: loadUser, refreshToken, userId }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
