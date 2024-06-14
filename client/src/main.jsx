// import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.jsx"
import AppProvider from "./context/AppProvider.jsx"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")).render(
    // <React.StrictMode>
    <AppProvider>
        <App />
    </AppProvider>,
    // </React.StrictMode>,
)

import { io } from "socket.io-client";

// Ganti dengan URL server Anda
const backendUrl = "https://le-code-server.vercel.app";

const socket = io(backendUrl, {
    transports: ["polling"],
    withCredentials: true
});

socket.on("connect", () => {
    console.log("Connected to server");
});

socket.on("connect_error", (error) => {
    console.error("Connection error:", error);
});
