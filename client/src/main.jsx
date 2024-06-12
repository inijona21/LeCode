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

const backendUrl = import.meta.env.VITE_BACKEND_URL;

fetch(`${backendUrl}/api/some-endpoint`)
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error))

