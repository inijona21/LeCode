import Users from "@/components/common/Users"
import useAppContext from "@/hooks/useAppContext"
import useSocket from "@/hooks/useSocket"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import UserStatus from "@/utils/status"
import toast from "react-hot-toast"
import { GoSignOut } from "react-icons/go"
import { IoShareOutline } from "react-icons/io5"
import { LuCopy } from "react-icons/lu"
import { useNavigate } from "react-router-dom"

function UsersTab() {
    const navigate = useNavigate()
    const { tabHeight } = useWindowDimensions()
    const { setStatus } = useAppContext()
    const { socket } = useSocket()

    const copyURL = async () => {
        const url = window.location.href
        try {
            await navigator.clipboard.writeText(url)
            toast.success("URL copied to clipboard")
        } catch (error) {
            toast.error("Unable to copy URL to clipboard")
            console.log(error)
        }
    }

    const shareURL = async () => {
        const url = window.location.href
        try {
            await navigator.share({ url })
        } catch (error) {
            toast.error("Unable to share URL")
            console.log(error)
        }
    }

    const leaveRoom = () => {
        socket.disconnect()
        setStatus(UserStatus.DISCONNECTED)
        navigate("/", {
            replace: true,
        })
    }

    return (
        <div
            className="flex flex-col gap-6 p-6 bg-black-900 text-white rounded-lg shadow-lg"
            style={{ height: tabHeight }}
        >
            <h1 className="text-2xl font-semibold border-b border-gray-700 pb-2">Users</h1>
            <div className="flex-1 overflow-auto">
                <Users />
            </div>
            <div className="grid grid-cols-3 gap-4">
                <button
                    className="flex items-center justify-center w-full p-4 bg-white text-black rounded-md transition-all hover:bg-gray-200"
                    onClick={shareURL}
                    title="Share Link"
                >
                    <IoShareOutline size={26} />
                </button>
                <button
                    className="flex items-center justify-center w-full p-4 bg-white text-black rounded-md transition-all hover:bg-gray-200"
                    onClick={copyURL}
                    title="Copy Link"
                >
                    <LuCopy size={22} />
                </button>
                <button
                    className="flex items-center justify-center w-full p-4 bg-green-600 text-black rounded-md transition-all hover:bg-green-700"
                    onClick={leaveRoom}
                    title="Leave room"
                >
                    <GoSignOut size={22} />
                </button>
            </div>
        </div>
    )
}

export default UsersTab