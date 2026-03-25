import React, { createContext, useContext, useEffect, type ReactNode } from "react";

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: false,
  isAuthenticated: true,
  login: async () => { },
  logout: async () => { },
});

// Guest user for guest-only mode
const GUEST_USER: User = {
  id: "guest",
  email: null,
  firstName: null,
  lastName: null,
  profileImageUrl: null,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  // Guest-only mode: always authenticated with guest user
  const user = GUEST_USER;
  const isLoading = false;
  const isAuthenticated = true;

  // TODO: Add Firebase authentication here
  // Once implemented:
  // - Replace GUEST_USER with Firebase user
  // - Use useAuth from firebase/auth
  // - Update login/logout to use Firebase methods
  // - Update fetchUser to get Firebase current user

  useEffect(() => {
    // TODO: Initialize Firebase auth listener
    // When adding Firebase, set up onAuthStateChanged here
  }, []);

  const login = async () => {
    // TODO: Implement Firebase login
    console.log("Login not yet implemented (guest mode only)");
  };

  const logout = async () => {
    // TODO: Implement Firebase logout
    console.log("Logout not yet implemented (guest mode only)");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
