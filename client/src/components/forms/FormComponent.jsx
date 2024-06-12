import useAppContext from "@/hooks/useAppContext"
import useSocket from "@/hooks/useSocket"
import ACTIONS from "@/utils/actions"
import UserStatus from "@/utils/status"
import { useEffect, useRef } from "react"
import { toast } from "react-hot-toast"
import { useLocation, useNavigate } from "react-router-dom"
import { v4 as uuidv4 } from "uuid"

function FormComponent() {
    const location = useLocation()
    const { currentUser, setCurrentUser, status, setStatus } = useAppContext()
    const { socket } = useSocket()
    const usernameRef = useRef(null)
    const navigate = useNavigate()

    const createNewRoomId = () => {
        setCurrentUser({ ...currentUser, roomId: uuidv4() })
        toast.success("Room ID baru telah dibuat")
        usernameRef.current.focus()
    }

    const handleInputChanges = (e) => {
        const name = e.target.name
        const value = e.target.value
        setCurrentUser({ ...currentUser, [name]: value })
    }

    const validateForm = () => {
        if (currentUser.username.length === 0) {
            toast.error("Masukkan Username Anda")
            return false
        } else if (currentUser.roomId.length === 0) {
            toast.error("Masukkan Room ID")
            return false
        } else if (currentUser.roomId.length < 5) {
            toast.error("Room ID harus memiliki minimal 5 karakter")
            return false
        } else if (currentUser.username.length < 3) {
            toast.error("Username harus memiliki minimal 5 karakter")
            return false
        }
        return true
    }

    const joinRoom = (e) => {
        e.preventDefault()
        if (status === UserStatus.ATTEMPTING_JOIN) return
        if (!validateForm()) return
        toast.loading("Memasuki Room...")
        setStatus(UserStatus.ATTEMPTING_JOIN)
        socket.emit(ACTIONS.JOIN_REQUEST, currentUser)
    }

    useEffect(() => {
        if (currentUser.roomId.length > 0) return
        if (location.state?.roomId) {
            setCurrentUser({ ...currentUser, roomId: location.state.roomId })
            if (currentUser.username.length === 0) {
                toast.success("Masukkan Username Anda")
            }
        }
    }, [currentUser, location.state?.roomId, setCurrentUser])

    useEffect(() => {
        if (status === UserStatus.DISCONNECTED && !socket.connected) {
            socket.connect()
            return
        }

        const isRedirect = sessionStorage.getItem("redirect") || false

        if (status === UserStatus.JOINED && !isRedirect) {
            const username = currentUser.username
            sessionStorage.setItem("redirect", true)
            navigate(`/editor/${currentUser.roomId}`, {
                state: {
                    username,
                },
            })
        } else if (status === UserStatus.JOINED && isRedirect) {
            sessionStorage.removeItem("redirect")
            socket.disconnect()
            socket.connect()
        }
    }, [currentUser, location.state?.redirect, navigate, socket, status])

    return (
        <div className="flex w-full max-w-md flex-col items-center justify-center gap-6 p-6 bg-transparent">
            <h1 className="text-4xl font-bold text-white">Le Code</h1>
            <p className="mb-6 text-center text-gray-300">
                {"Kodenya Milik Anda, Kolaborasinya Milik Kita."}
            </p>
            <form onSubmit={joinRoom} className="flex w-full flex-col gap-4">
                <input
                    type="text"
                    name="roomId"
                    placeholder="Room Id"
                    className="w-full rounded-lg border border-white bg-black text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white-500"
                    onChange={handleInputChanges}
                    value={currentUser.roomId}
                />
                <input
                    type="text"
                    name="username"
                    placeholder="Username"
                    className="w-full rounded-lg border border-white bg-black text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white-500"
                    onChange={handleInputChanges}
                    value={currentUser.username}
                    ref={usernameRef}
                />
                <button
                    type="submit"
                    className="mt-4 w-full rounded-lg bg-white px-4 py-2 text-lg font-semibold text-black hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white"
                >   
                    Join
                </button>
            </form>
            <button
                className="mt-4 text-white hover:underline focus:outline-none"
                onClick={createNewRoomId}
            >
                Buat Room ID Baru
            </button>
        </div>
    )
}

export default FormComponent
