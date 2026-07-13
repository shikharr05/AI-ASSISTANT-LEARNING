/*
|--------------------------------------------------------------------------
| Auth Context (Global Authentication State)
|--------------------------------------------------------------------------
| This file manages the authentication state of the entire React application.
|
| Responsibilities:
| 1. Stores the currently logged-in user's information.
| 2. Tracks whether the user is authenticated.
| 3. Restores login state from localStorage after page refresh.
| 4. Provides login(), logout(), and updateUser() functions to all components.
| 5. Prevents prop drilling by using React Context API.
|
| Any component wrapped inside <AuthProvider> can access authentication
| data by simply calling useAuth().
|--------------------------------------------------------------------------
*/
import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  //whenever site reloads checkAuthStatus function runs...
  // Checks whether the user was previously logged in.
  // If a valid token and user data exist in localStorage,
  // restore them into React state so the user remains logged
  // in even after refreshing the page.
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");

      if (token && userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error("Auth check failed: ", error);
      logout();
    } finally {
      setLoading(false);
    }
  };
  // Stores the JWT token and user information in localStorage
  // for persistent login and updates the global authentication state.
  const login = (userData, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));

    setUser(userData);
    setIsAuthenticated(true);
  };
  // Clears authentication data from localStorage,
  // resets the global auth state, and redirects
  // the user back to the login/home page.
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = "/";
  };
  // Updates the user's information both in React state
  // and localStorage so all components immediately receive
  // the latest profile data.
  const updateUser = (updatedUserData) => {
    const newUserData = { ...user, ...updatedUserData };
    localStorage.setItem("user", JSON.stringify(newUserData));
    setUser(newUserData);
  };

  // These values and functions are shared globally with every
  // component wrapped inside <AuthProvider>.
  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    updateUser,
    checkAuthStatus,
  };
  // Makes the authentication state and helper functions available
  // to all child components through React Context.
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

//AuthContext is the frontend's global authentication manager. It stores the logged-in user's information and authentication state, synchronizes it with localStorage, and provides helper functions (login, logout, updateUser) so any React component can access or modify authentication data without prop drilling.
