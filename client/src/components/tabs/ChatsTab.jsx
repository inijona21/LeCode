import useWindowDimensions from "@/hooks/useWindowDimensions"
import ChatInput from "@/components/chats/ChatInput"
import ChatList from "@/components/chats/ChatList"

function ChatsTab() {
    const { tabHeight } = useWindowDimensions()

    return (
        <div
            className="flex flex-col gap-4 p-6 bg-black-900 text-white rounded-lg shadow-lg"
            style={{ height: tabHeight }}
        >
            <h1 className="text-2xl font-semibold border-b border-black-700 pb-2">Chat</h1>
            <div className="flex-1 overflow-auto bg-black-800 rounded-lg p-4">
                <ChatList />
            </div>
            <div className="mt-4">
                <ChatInput />
            </div>
        </div>
    )
}

export default ChatsTab
