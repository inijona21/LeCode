import useResponsive from "@/hooks/useResponsive"
import useTab from "@/hooks/useTabs"
import TabButton from "@/components/tabs/TabButton"
import TABS from "@/utils/tabs"

function Sidebar() {
    const { activeTab, isSidebarOpen, tabComponents, tabIcons } = useTab()
    const { showSidebar } = useResponsive()

    return (
        <aside className="flex w-full md:h-full md:max-h-full md:min-h-full md:w-auto">
            <div
                className="fixed bottom-0 left-0 z-50 flex h-[56px] w-full gap-2 self-end overflow-x-auto overflow-y-hidden border-t border-darkHover bg-dark p-2 md:static md:h-full md:w-[50px] md:min-w-[50px] md:flex-col md:border-r md:border-t-0 md:p-2 md:pt-4"
                style={showSidebar ? {} : { display: "none" }}
            >
                <div className="flex flex-row md:flex-col justify-between md:justify-center items-center md:items-center gap-2 md:gap-8 flex-grow w-full md:w-auto">
                    <TabButton tabName={TABS.FILES} icon={tabIcons[TABS.FILES]} className="w-8 h-8" />
                    <TabButton tabName={TABS.CHATS} icon={tabIcons[TABS.CHATS]} className="w-8 h-8" />
                    <TabButton tabName={TABS.RUN} icon={tabIcons[TABS.RUN]} className="w-8 h-8" />
                    <TabButton tabName={TABS.CLIENTS} icon={tabIcons[TABS.CLIENTS]} className="w-8 h-8" />
                    <TabButton tabName={TABS.SETTINGS} icon={tabIcons[TABS.SETTINGS]} className="w-8 h-8" />
                </div>
            </div>
            <div
                className="absolute left-0 top-0 z-20 w-full flex-grow flex-col bg-dark md:static md:w-[300px]" 
                style={isSidebarOpen ? {} : { display: "none" }}
            >
                {tabComponents[activeTab]}
            </div>
        </aside>
    )
}

export default Sidebar
