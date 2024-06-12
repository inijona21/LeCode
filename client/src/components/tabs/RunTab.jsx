import { useRunCode } from "@/hooks/useRunCode"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import toast from "react-hot-toast"
import { PiCaretDownBold } from "react-icons/pi"
import { LuCopy } from "react-icons/lu"

function RunTab() {
    const { tabHeight } = useWindowDimensions()
    const {
        setInput,
        output,
        isRunning,
        supportedLanguages,
        selectedLanguage,
        setSelectedLanguage,
        runCode,
    } = useRunCode()

    const handleLanguageChange = (e) => {
        const lang = JSON.parse(e.target.value)
        setSelectedLanguage(lang)
    }

    const copyOutput = () => {
        navigator.clipboard.writeText(output)
        toast.success("Output copied to clipboard")
    }

    return (
        <div
            className="flex flex-col gap-6 p-6 bg-black-900 text-white rounded-lg shadow-lg"
            style={{ height: tabHeight }}
        >
            <h1 className="text-2xl font-semibold border-b border-black-700 pb-2">Run Code</h1>
            <div className="flex flex-col gap-4">
                <div className="relative w-full">
                    <select
                        className="w-full rounded-md border-none bg-black-800 px-4 py-2 text-black outline-none"
                        value={JSON.stringify(selectedLanguage)}
                        onChange={handleLanguageChange}
                    >
                        {supportedLanguages
                            .sort((a, b) => (a.language > b.language ? 1 : -1))
                            .map((lang, i) => {
                                return (
                                    <option
                                        key={i}
                                        value={JSON.stringify(lang)}
                                    >
                                        {lang.language +
                                            (lang.version
                                                ? ` (${lang.version})`
                                                : "")}
                                    </option>
                                )
                            })}
                    </select>
                    <PiCaretDownBold
                        size={16}
                        className="absolute bottom-3 right-4 z-10 text-white"
                    />
                </div>
                <textarea
                    type="text"
                    className="min-h-[120px] w-full resize-none rounded-md border-none bg-black-800 p-4 text-black outline-none"
                    placeholder="Write your input here..."
                    onChange={(e) => setInput(e.target.value)}
                />
                <button
                    className="flex w-full justify-center rounded-md bg-green-600 p-4 font-bold text-black outline-none transition-all hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={runCode}
                    disabled={isRunning}
                >
                    Run
                </button>
                <div className="flex items-center justify-between">
                    <span className="font-semibold">Output :</span>
                    <button onClick={copyOutput} title="Copy Output">
                        <LuCopy
                            size={18}
                            className="cursor-pointer text-white"
                        />
                    </button>
                </div>
                <div className="w-full flex-grow resize-none overflow-y-auto rounded-md border-none bg-black-800 p-4 text-white outline-none">
                    <code>
                        <pre className="text-wrap">{output}</pre>
                    </code>
                </div>
            </div>
        </div>
    )
}

export default RunTab
