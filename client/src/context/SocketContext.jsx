import useAppContext from "@/hooks/useAppContext"
import ACTIONS from "@/utils/actions"
import UserStatus from "@/utils/status"
import PropTypes from "prop-types"
import { createContext, useCallback, useEffect, useMemo, useState, useContext } from "react"
import { toast } from "react-hot-toast"
import { io } from "socket.io-client"

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"

const SocketContext = createContext()

export const useSocket = () => {
    const context = useContext(SocketContext)
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider')
    }
    return context.socket
}

export const SocketProvider = ({ children }) => {
    const { setUsers, setStatus, setCurrentUser } = useAppContext()
    const [breakoutRooms, setBreakoutRooms] = useState([])
    
    console.log('=== CREATING SOCKET ===', BACKEND_URL)
    
    const socket = useMemo(
        () =>
            io(BACKEND_URL, {
                reconnectionAttempts: 2,
                transports: ["websocket", "polling"],
            }),
        [],
    )

    useEffect(() => {
        socket.on("connect", () => {
            console.log('=== SOCKET CONNECTED ===', socket.id)
        })

        socket.on("disconnect", () => {
            console.log('=== SOCKET DISCONNECTED ===')
        })

        socket.on("connect_error", (error) => {
            console.error('=== SOCKET CONNECTION ERROR ===', error)
        })

        return () => {
            console.log('=== CLEANING UP SOCKET ===')
        }
    }, [socket])

    const handleError = useCallback(
        (err) => {
            console.log("socket error", err)
            setStatus(UserStatus.CONNECTION_FAILED)
            toast.dismiss()
            toast.error("Failed to connect to the server")
        },
        [setStatus],
    )

    const handleUsernameExist = useCallback(() => {
        toast.dismiss()
        setStatus(UserStatus.INITIAL)
        toast.error(
            "The username you chose already exists in the room. Please choose a different username.",
        )
    }, [setStatus])

    const handleJoiningAccept = useCallback(
        ({ user, users }) => {
            console.log('[JOIN_ACCEPTED]', { 
                user: { ...user }, 
                users: users.map(u => ({ username: u.username, isRoomMaster: u.isRoomMaster }))
            });
            
            // Ensure isRoomMaster is properly set
            const userWithAllProps = {
                username: user.username,
                roomId: user.roomId,
                status: user.status,
                cursorPosition: user.cursorPosition,
                typing: user.typing,
                socketId: user.socketId,
                currentFile: user.currentFile,
                isRoomMaster: user.isRoomMaster === true,
                breakoutRoomId: user.breakoutRoomId
            };
            
            console.log('[SETTING CURRENT USER]', userWithAllProps);
            setCurrentUser(userWithAllProps)
            setUsers(users)
            toast.dismiss()
            setStatus(UserStatus.JOINED)
        },
        [setCurrentUser, setStatus, setUsers],
    )

    const handleUserLeft = useCallback(
        ({ user }) => {
            toast.success(`${user.username} left the room`)
            setUsers((prev) => {
                return prev.filter((u) => u.username !== user.username)
            })
        },
        [setUsers],
    )

    // Breakout room event handlers
    const handleBreakoutRoomsList = useCallback(({ rooms }) => {
        setBreakoutRooms(rooms)
    }, [])

    const handleAssignedToBreakoutRoom = useCallback(({ breakoutRoomId, name }) => {
        setCurrentUser(prev => ({ ...prev, breakoutRoomId }))
        toast.success(`You have been assigned to breakout room: ${name}`)
    }, [setCurrentUser])

    const handleBreakoutRoomJoined = useCallback(({ user, users }) => {
        toast.success(`Joined breakout room`)
    }, [])

    const handleBreakoutRoomLeft = useCallback(({ user, users }) => {
        setCurrentUser(prev => ({ ...prev, breakoutRoomId: null }))
        toast.success(`Left breakout room`)
    }, [setCurrentUser])

    const handleBreakoutRoomClosed = useCallback(() => {
        setCurrentUser(prev => ({ ...prev, breakoutRoomId: null }))
        toast.success(`Breakout room has been closed`)
    }, [setCurrentUser])

    useEffect(() => {
        socket.on("connect_error", handleError)
        socket.on("connect_failed", handleError)
        socket.on(ACTIONS.USERNAME_EXISTS, handleUsernameExist)
        socket.on(ACTIONS.JOIN_ACCEPTED, handleJoiningAccept)
        socket.on(ACTIONS.USER_DISCONNECTED, handleUserLeft)

        // Breakout room events
        socket.on("BREAKOUT_ROOMS_LIST", handleBreakoutRoomsList)
        socket.on("ASSIGNED_TO_BREAKOUT_ROOM", handleAssignedToBreakoutRoom)
        socket.on("BREAKOUT_ROOM_JOINED", handleBreakoutRoomJoined)
        socket.on("BREAKOUT_ROOM_LEFT", handleBreakoutRoomLeft)
        socket.on("BREAKOUT_ROOM_CLOSED", handleBreakoutRoomClosed)

        // Listen for master status update
        const handleUpdateMasterStatus = ({ isRoomMaster }) => {
            setCurrentUser(prev => ({ ...prev, isRoomMaster }))
        }
        socket.on('UPDATE_MASTER_STATUS', handleUpdateMasterStatus)

        return () => {
            socket.off("connect_error")
            socket.off("connect_failed")
            socket.off(ACTIONS.USERNAME_EXISTS)
            socket.off(ACTIONS.JOIN_ACCEPTED)
            socket.off(ACTIONS.USER_DISCONNECTED)

            // Breakout room events cleanup
            socket.off("BREAKOUT_ROOMS_LIST")
            socket.off("ASSIGNED_TO_BREAKOUT_ROOM")
            socket.off("BREAKOUT_ROOM_JOINED")
            socket.off("BREAKOUT_ROOM_LEFT")
            socket.off("BREAKOUT_ROOM_CLOSED")
            socket.off('UPDATE_MASTER_STATUS', handleUpdateMasterStatus)
        }
    }, [
        handleError,
        handleJoiningAccept,
        handleUserLeft,
        handleUsernameExist,
        handleBreakoutRoomsList,
        handleAssignedToBreakoutRoom,
        handleBreakoutRoomJoined,
        handleBreakoutRoomLeft,
        handleBreakoutRoomClosed,
        setUsers,
        socket,
        setCurrentUser
    ])

    return (
        <SocketContext.Provider
            value={{
                socket,
                breakoutRooms,
                setBreakoutRooms,
            }}
        >
            {children}
        </SocketContext.Provider>
    )
}

SocketProvider.propTypes = {
    children: PropTypes.node.isRequired,
}

export { SocketProvider }
export default SocketContext
