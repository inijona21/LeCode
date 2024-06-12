import ChatsTab from "@/components/tabs/ChatsTab"
import FilesTab from "@/components/tabs/FilesTab"
import RunTab from "@/components/tabs/RunTab"
import SettingsTab from "@/components/tabs/SettingsTab"
import UsersTab from "@/components/tabs/UsersTab"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import TABS from "@/utils/tabs"
import PropTypes from "prop-types"
import { createContext, useState } from "react"
import { IoSettingsOutline } from "react-icons/io5"
import { LuFiles } from "react-icons/lu"
import { PiChats, PiPlay, PiUsers } from "react-icons/pi"

const TabContext = createContext()

function TabContextProvider({ children }) {
    const { isMobile } = useWindowDimensions()
    const [activeTab, setActiveTab] = useState(TABS.FILES)
    const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile)
    const [tabComponents, setTabComponents] = useState({
        [TABS.FILES]: <FilesTab />,
        [TABS.CLIENTS]: <UsersTab />,
        [TABS.SETTINGS]: <SettingsTab />,
        [TABS.CHATS]: <ChatsTab />,
        [TABS.RUN]: <RunTab />,
    })
    const tabIcons = {
        [TABS.SETTINGS]: <IoSettingsOutline size={28}/>,
        [TABS.FILES]: <LuFiles size={28}/>,
        [TABS.CLIENTS]: <PiUsers size={30}/>,
        [TABS.CHATS]: <PiChats size={30}/>,
        [TABS.RUN]: <PiPlay size={28}/>,
    }

    return (
        <div className="sidebar">
            <TabContext.Provider
                value={{
                    activeTab,
                    setActiveTab,
                    isSidebarOpen,
                    setIsSidebarOpen,
                    tabComponents,
                    setTabComponents,
                    tabIcons,
                }}
            >
                {Object.values(tabIcons).map((icon, index) => (
                    <div key={index} className="sidebar-icon-container">
                        {icon}
                    </div>
                ))}
                {children}
            </TabContext.Provider>
        </div>
    )
}

TabContextProvider.propTypes = {
    children: PropTypes.node.isRequired,
}

export { TabContextProvider }
export default TabContext
