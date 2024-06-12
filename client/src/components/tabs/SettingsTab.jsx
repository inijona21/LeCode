import Select from "@/components/common/Select"
import useSetting from "@/hooks/useSetting"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import { editorFonts } from "@/resources/Fonts"
import { editorThemes } from "@/resources/Themes"
import { useEffect } from "react"
import { langNames } from "@uiw/codemirror-extensions-langs"

function SettingsTab() {
    const {
        theme,
        setTheme,
        language,
        setLanguage,
        fontSize,
        setFontSize,
        fontFamily,
        setFontFamily,
        showGitHubCorner,
        setShowGitHubCorner,
        resetSettings,
    } = useSetting()
    const { tabHeight } = useWindowDimensions()

    const handleFontFamilyChange = (e) => setFontFamily(e.target.value)
    const handleThemeChange = (e) => setTheme(e.target.value)
    const handleLanguageChange = (e) => setLanguage(e.target.value)
    const handleFontSizeChange = (e) => setFontSize(e.target.value)
    const handleShowGitHubCornerChange = (e) =>
        setShowGitHubCorner(e.target.checked)

    useEffect(() => {
        // Set editor font family
        const editor = document.querySelector(".cm-editor > .cm-scroller")
        if (editor !== null) {
            editor.style.fontFamily = `${fontFamily}, monospace`
        }
    }, [fontFamily])

    return (
        <div
            className="flex flex-col gap-6 p-6 bg-black-900 text-white rounded-lg shadow-lg"
            style={{ height: tabHeight }}
        >
            <h1 className="text-2xl font-semibold border-b border-gray-700 pb-2">Settings</h1>
            <div className="grid grid-cols-1 gap-4">
                {/* Choose Font Family option */}
                <div className="flex flex-col gap-2">
                    <label className="text-lg font-medium">Fonts</label>
                    <Select
                        onChange={handleFontFamilyChange}
                        value={fontFamily}
                        options={editorFonts}
                        className="rounded-md border-none bg-gray-800 px-4 py-2 text-white outline-none"
                    />
                </div>
                {/* Choose font size option */}
                <div className="flex flex-col gap-2">
                    <label className="text-lg font-medium">Font Size</label>
                    <select
                        value={fontSize}
                        onChange={handleFontSizeChange}
                        className="rounded-md border-none bg-black-800 px-4 py-2 text-black outline-none"
                    >
                        {[...Array(13).keys()].map((size) => {
                            return (
                                <option key={size} value={size + 12}>
                                    {size + 12}
                                </option>
                            )
                        })}
                    </select>
                </div>
                {/* Choose theme option */}
                <div className="flex flex-col gap-2">
                    <label className="text-lg font-medium">Themes</label>
                    <Select
                        onChange={handleThemeChange}
                        value={theme}
                        options={Object.keys(editorThemes)}
                        className="rounded-md border-none bg-gray-800 px-4 py-2 text-white outline-none"
                    />
                </div>
                {/* Choose language option */}
                <div className="flex flex-col gap-2">
                    <label className="text-lg font-medium">Editor Languages</label>
                    <Select
                        onChange={handleLanguageChange}
                        value={language}
                        options={langNames}
                        className="rounded-md border-none bg-gray-800 px-4 py-2 text-white outline-none"
                    />
                </div>
            </div>
            <button
                className="mt-auto w-full rounded-md border-none bg-black-800 px-4 py-2 text-white outline-none transition-all hover:bg-gray-700"
                onClick={resetSettings}
            >
                Reset to default
            </button>
        </div>
    )
}

export default SettingsTab
