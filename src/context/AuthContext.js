import React, { createContext, useContext, useEffect, useState } from "react";
import { apiLogin, apiRegister, apiMe } from "../api/authApi";
import { setAuthToken, getAuthToken } from "../api/backendClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const t = await getAuthToken();

        if (!t) {
          setReady(true);
          return;
        }

        setToken(t);

        const me = await apiMe(t);
        setUser(me.user);
      } catch (e) {
        // token invalid /  / server down etc.
        await setAuthToken(null);
        setToken(null);
        setUser(null);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setUserSafe = (u) => setUser(u);

  const refreshMe = async () => {
    if (!token) return null;
    const me = await apiMe(token);
    setUser(me.user);
    return me.user;
  };

  const signUp = async (fullName, username, email, password, phone = null) => {
    const res = await apiRegister({
      fullName,
      username,
      email,
      password,
      phone,
    });

    await setAuthToken(res.token);
    setToken(res.token);
    setUser(res.user);

    return res.user;
  };

  const signIn = async (email, password) => {
    const res = await apiLogin({ email, password });

    await setAuthToken(res.token);
    setToken(res.token);
    setUser(res.user);

    return res.user;
  };

  const signOut = async () => {
    await setAuthToken(null);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        ready,
        signUp,
        signIn,
        signOut,
        setUserSafe,
        refreshMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
