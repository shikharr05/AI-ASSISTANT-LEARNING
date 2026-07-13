// Auth Service
//
// Acts as the communication layer between React components
// and the backend authentication APIs.
//
// Responsibilities:
// - Sends authentication-related HTTP requests using axiosInstance.
// - Returns only the useful response data.
// - Handles API errors and forwards simplified error objects
//   to the calling React components.
//
// This keeps UI components focused only on rendering and user interaction,
// while all authentication API logic remains centralized here.

import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";

const login = async (email, password) => {
  try {
    const response = await axiosInstance.post(API_PATHS.AUTH.LOGIN, {
      email,
      password,
    });

    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "An unknown error occurred!" };
  }
};

const register = async (username, email, password) => {
  try {
    const response = await axiosInstance.post(API_PATHS.AUTH.REGISTER, {
      username,
      email,
      password,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "An unknown error occurred!" };
  }
};

const getProfile = async () => {
  try {
    const response = await axiosInstance.get(API_PATHS.AUTH.GET_PROFILE);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "An unknown error occurred!" };
  }
};

const updateProfile = async (userData) => {
  try {
    const response = await axiosInstance.put(
      API_PATHS.AUTH.UPDATE_PROFILE,
      userData,
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "An unknown error occurred!" };
  }
};

const changePassword = async (passwords) => {
  try {
    const response = await axiosInstance.post(
      API_PATHS.AUTH.CHANGE_PASSWORD,
      passwords,
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "An unknown error occurred!" };
  }
};

const authService = {
  login,
  register,
  getProfile,
  updateProfile,
  changePassword,
};

export default authService;
