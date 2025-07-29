import PropTypes from "prop-types"
import { createContext, useState } from "react"
import UserStatus from "@/utils/status"
const AppContext = createContext()

function AppContextProvider({ children }) {
    const [users, setUsers] = useState([])
    const [status, setStatus] = useState(UserStatus.INITIAL)
    const [currentUser, setCurrentUser] = useState({
        username: "",
        roomId: "",
        isRoomMaster: false,
        breakoutRoomId: null
    })
    const [breakoutRooms, setBreakoutRooms] = useState([])
    // Track which room the user is currently in (main or breakout)
    const [activeRoomId, setActiveRoomId] = useState("")

    return (
        <AppContext.Provider
            value={{
                users,
                setUsers,
                currentUser,
                setCurrentUser,
                status,
                setStatus,
                breakoutRooms,
                setBreakoutRooms,
                activeRoomId,
                setActiveRoomId,
            }}
        >
            {children}
        </AppContext.Provider>
    )
}

AppContextProvider.propTypes = {
    children: PropTypes.node.isRequired,
}

export { AppContextProvider }
export default AppContext
