// Axios Instance
//
// Creates a centralized Axios client used throughout the application.
//
// Request Interceptor:
// - Runs before every API request.
// - Automatically attaches the JWT token from localStorage
//   to the Authorization header so protected backend routes
//   can authenticate the user.
//
// Response Interceptor:
// - Runs after every API response.
// - Handles common errors such as server errors (500)
//   and request timeouts before passing the response/error
//   back to the calling component.
//
// This avoids repeating authentication headers and
// common error handling in every API call.

import axios from "axios";
import { BASE_URL } from "./apiPaths";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 80000, // this means wait for 80 seconds for backend response and if tno repsonse then axios throws a timeout error
  headers: {
    "Content-Type": "application/json", //this means with every request axios also sends to backend that he is sending in json format
    Accept: "application/json", // and accepts json format.
  },
});

//Request Interceptor
//this is like whenever we make a request axiosInstance.get("/api/documents") then always this function will run first.
axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem("token");
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`; //stored the token in authorization in header.
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);
//now config has head which further has authorization which has the token which backend needs to access database which is checked in our protect middleware.

//Response Interceptor

//now when backend sends response to frontend and before frontend recieves it, this below function runs everytime.
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      if (error.response.status === 500) {
        console.error("Server error! Please try again later.");
      } else if (error.response.status === 401) {
        localStorage.removeItem("token");
        // Force the user back to the login page
        window.location.href = "/login";
      }
    }  else if (error.code === "ECONNABORTED") {
      console.error("Request Timeout! Please try again later.");
    }
    return Promise.reject(error);
  },
);
//basically just handling errors if backend sends any in response interceptor.
export default axiosInstance;
