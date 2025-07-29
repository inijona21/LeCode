import PropTypes from "prop-types"
import Avatar from "react-avatar"
import ACTIONS from "@/utils/actions"
import useAppContext from "@/hooks/useAppContext"
import { useState } from "react"
import BreakoutRoomModal from "./BreakoutRoomModal"

function Users() {
    const { users, currentUser, activeRoomId } = useAppContext()
    const [isBreakoutModalOpen, setIsBreakoutModalOpen] = useState(false)

    // Filter users in the same room as activeRoomId
    const filteredUsers = users.filter(user => {
        if (!activeRoomId) return true // fallback: show all
        if (activeRoomId === currentUser.roomId) {
            return !user.breakoutRoomId
        }
        return user.breakoutRoomId === activeRoomId
    })

    return (
        <div className="flex min-h-[200px] flex-grow flex-col justify-center overflow-y-auto py-2">
            {/* Breakout Room Button - Now visible to all users */}
            <div className="mb-4 flex justify-center">
                <button
                    onClick={() => setIsBreakoutModalOpen(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                    Breakout Rooms
                </button>
            </div>

            {/* Users List */}
            <div className="flex h-full w-full flex-wrap items-start gap-x-2 gap-y-6">
                {filteredUsers.map((user) => {
                    return <User key={user.socketId} user={user} />
                })}
            </div>

            {/* Breakout Room Modal */}
            <BreakoutRoomModal 
                isOpen={isBreakoutModalOpen}
                onClose={() => setIsBreakoutModalOpen(false)}
            />
        </div>
    )
}

const User = ({ user }) => {
    const { username, status, isRoomMaster, breakoutRoomId } = user
    const title = `${username} - ${status === ACTIONS.USER_ONLINE ? "online" : "offline"}`

    return (
        <div
            className="relative flex w-[100px] flex-col items-center gap-2"
            title={title}
        >
            <Avatar name={username} size="50" round={"12px"} title={title} />
            <p className="line-clamp-2 max-w-full text-ellipsis break-words text-center">
                {username}
            </p>
            <div className="flex flex-col items-center gap-1">
                <div
                    className={`h-3 w-3 rounded-full ${
                        status === ACTIONS.USER_ONLINE ? "bg-green-500" : "bg-danger"
                    }`}
                ></div>
                {/* Show role and breakout room status */}
                <div className="text-xs text-gray-500 text-center">
                    {isRoomMaster && <span className="block text-blue-600">Master</span>}
                    {breakoutRoomId && <span className="block text-orange-600">In Breakout</span>}
                </div>
            </div>
        </div>
    )
}

User.propTypes = {
    user: PropTypes.object.isRequired,
}

export default Users
