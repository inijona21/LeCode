import PropTypes from "prop-types"
import { useState, useEffect } from "react"
import useAppContext from "@/hooks/useAppContext"
import useSocket from "@/hooks/useSocket"
import { toast } from "react-hot-toast"

function BreakoutRoomModal({ isOpen, onClose }) {
    const { currentUser, users, breakoutRooms, setBreakoutRooms, activeRoomId, setActiveRoomId } = useAppContext()
    const { socket } = useSocket()
    const [newRoomName, setNewRoomName] = useState("")
    const [selectedUser, setSelectedUser] = useState("")
    const [selectedBreakoutRoom, setSelectedBreakoutRoom] = useState("")

    // Debug logging
    console.log('[BREAKOUT MODAL]', { 
        currentUser, 
        isRoomMaster: currentUser.isRoomMaster,
        username: currentUser.username,
        roomId: currentUser.roomId
    });

    // Main room object
    const mainRoom = {
        id: currentUser.roomId,
        name: "Main Room",
        users: users.filter(u => !u.breakoutRoomId),
        isMain: true
    }

    // All rooms: main + breakout
    const allRooms = [mainRoom, ...breakoutRooms]

    // Get users in a room
    const getUsersInRoom = (roomId) => {
        if (roomId === currentUser.roomId) {
            return users.filter(u => !u.breakoutRoomId)
        }
        return users.filter(u => u.breakoutRoomId === roomId)
    }

    // Fetch breakout rooms list
    const fetchBreakoutRooms = () => {
        socket.emit("GET_BREAKOUT_ROOMS", {
            parentRoomId: currentUser.roomId
        }, (response) => {
            if (response.rooms) {
                setBreakoutRooms(response.rooms)
            }
        })
    }

    // Fetch rooms when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchBreakoutRooms()
        }
    }, [isOpen])

    // Listen for ASSIGNED_TO_BREAKOUT_ROOM event to force fetch
    useEffect(() => {
        const handler = () => {
            fetchBreakoutRooms()
        }
        socket.on("ASSIGNED_TO_BREAKOUT_ROOM", handler)
        return () => socket.off("ASSIGNED_TO_BREAKOUT_ROOM", handler)
    }, [socket])

    const createBreakoutRoom = () => {
        if (!newRoomName.trim()) {
            toast.error("Please enter a room name")
            return
        }

        console.log('[CREATE BREAKOUT]', { 
            currentUser, 
            isRoomMaster: currentUser.isRoomMaster,
            roomName: newRoomName.trim()
        });

        socket.emit("CREATE_BREAKOUT_ROOM", {
            parentRoomId: currentUser.roomId,
            name: newRoomName.trim()
        }, (response) => {
            if (response.error) {
                toast.error(response.error)
                console.log('[CREATE ERROR]', response.error);
            } else {
                toast.success(`Breakout room "${response.name}" created successfully`)
                setNewRoomName("")
                fetchBreakoutRooms()
            }
        })
    }

    // Join a room (main or breakout)
    const joinRoom = (roomId) => {
        if (roomId === currentUser.roomId) {
            // Join main room (leave breakout if needed)
            if (currentUser.breakoutRoomId) {
                socket.emit("LEAVE_BREAKOUT_ROOM", {
                    breakoutRoomId: currentUser.breakoutRoomId
                }, (response) => {
                    if (response.error) {
                        toast.error(response.error)
                    } else {
                        setActiveRoomId(currentUser.roomId)
                        toast.success("Joined Main Room")
                    }
                })
            } else {
                setActiveRoomId(currentUser.roomId)
                toast.success("Already in Main Room")
            }
        } else {
            // Join breakout room (leave current if needed)
            if (currentUser.breakoutRoomId && currentUser.breakoutRoomId !== roomId) {
                // Leave current breakout first
                socket.emit("LEAVE_BREAKOUT_ROOM", {
                    breakoutRoomId: currentUser.breakoutRoomId
                }, () => {
                    // Then join new breakout
                    socket.emit("JOIN_BREAKOUT_ROOM", {
                        breakoutRoomId: roomId
                    }, (response) => {
                        if (response.error) {
                            toast.error(response.error)
                        } else {
                            setActiveRoomId(roomId)
                            toast.success("Joined Breakout Room")
                        }
                    })
                })
            } else if (!currentUser.breakoutRoomId) {
                // Direct join
                socket.emit("JOIN_BREAKOUT_ROOM", {
                    breakoutRoomId: roomId
                }, (response) => {
                    if (response.error) {
                        toast.error(response.error)
                    } else {
                        setActiveRoomId(roomId)
                        toast.success("Joined Breakout Room")
                    }
                })
            }
        }
    }

    // Leave current breakout room (go back to main)
    const leaveBreakoutRoom = () => {
        if (!currentUser.breakoutRoomId) return
        socket.emit("LEAVE_BREAKOUT_ROOM", {
            breakoutRoomId: currentUser.breakoutRoomId
        }, (response) => {
            if (response.error) {
                toast.error(response.error)
            } else {
                setActiveRoomId(currentUser.roomId)
                toast.success("Returned to Main Room")
            }
        })
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Breakout Rooms</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        ✕
                    </button>
                </div>

                {/* Create New Breakout Room */}
                {currentUser.isRoomMaster && (
                    <div className="mb-6 p-4 border rounded-lg">
                        <h3 className="font-semibold mb-2 text-gray-800">Create New Breakout Room</h3>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Room name"
                                value={newRoomName}
                                onChange={(e) => setNewRoomName(e.target.value)}
                                className="flex-1 px-3 py-2 border rounded text-gray-800 placeholder-gray-400"
                            />
                            <button
                                onClick={createBreakoutRoom}
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                )}

                {/* Room List (main + breakout) */}
                <div className="mb-6 p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2 text-gray-800">Available Rooms</h3>
                    <div className="space-y-2">
                        {allRooms.map(room => (
                            <div key={room.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-2 border rounded ${activeRoomId === room.id ? "bg-blue-50" : ""}`}>
                                <div>
                                    <span className="font-medium text-gray-800">{room.name}</span>
                                    <span className="ml-2 text-xs text-gray-600">({getUsersInRoom(room.id).length} user{getUsersInRoom(room.id).length !== 1 ? "s" : ""})</span>
                                </div>
                                <div className="flex gap-2 mt-2 sm:mt-0">
                                    {activeRoomId === room.id ? (
                                        <span className="px-3 py-1 bg-green-500 text-white rounded">Active</span>
                                    ) : (
                                        <button
                                            onClick={() => joinRoom(room.id)}
                                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                                        >
                                            Join
                                        </button>
                                    )}
                                </div>
                                {/* List users in this room */}
                                <div className="mt-2 text-xs text-gray-600">
                                    Users: {getUsersInRoom(room.id).map(u => u.username).join(", ") || "None"}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

BreakoutRoomModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
}

export default BreakoutRoomModal 