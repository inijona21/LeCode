import FileSystem from "@/components/files/FileSystem"
import useFileSystem from "@/hooks/useFileSystem"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import langMap from "lang-map"
import { useRef } from "react"
import { BiArchiveIn } from "react-icons/bi"
import { LuDownload } from "react-icons/lu"
import { TbFileUpload } from "react-icons/tb"
import { v4 as uuidv4 } from "uuid"

function FilesTab() {
    const {
        currentFile,
        setCurrentFile,
        updateFile,
        setFiles,
        downloadCurrentFile,
        downloadAllFiles,
    } = useFileSystem()
    const fileInputRef = useRef(null)
    const { tabHeight } = useWindowDimensions()

    const handleOpenFile = () => {
        fileInputRef.current.click()
    }
    const onFileChange = (e) => {
        const selectedFile = e.target.files[0]
        const reader = new FileReader()
        reader.onload = (e) => {
            const text = e.target.result
            const file = {
                id: uuidv4(),
                name: selectedFile.name,
                content: text,
            }
            // Save current file before opening new file
            updateFile(currentFile.id, currentFile.content)

            setFiles((prev) => [...prev, file])
            setCurrentFile(file)
        }
        reader.readAsText(selectedFile)
    }

    const allowedFileExtensions = Object.keys(langMap().languages).join(",")

    return (
        <div
            className="flex flex-col gap-6 p-6 bg-black-900 text-white rounded-lg shadow-lg"
            style={{ height: tabHeight }}
        >
            <h1 className="text-2xl font-semibold border-b border-gray-700 pb-2">Files</h1>
            <div className="flex-1 overflow-auto">
                <FileSystem />
            </div>
            <div className="grid grid-cols-1 gap-4">
                <button
                    className="flex items-center justify-center w-full p-4 bg-blue-600 rounded-md transition-all hover:bg-blue-700"
                    onClick={handleOpenFile}
                >
                    <TbFileUpload className="mr-2" size={24} />
                    Open File
                </button>
                <button
                    className="flex items-center justify-center w-full p-4 bg-green-600 rounded-md transition-all hover:bg-green-700"
                    onClick={downloadCurrentFile}
                >
                    <LuDownload className="mr-2" size={22} /> Download File
                </button>
                <button
                    className="flex items-center justify-center w-full p-4 bg-red-600 rounded-md transition-all hover:bg-red-700"
                    onClick={downloadAllFiles}
                >
                    <BiArchiveIn className="mr-2" size={22} /> Download All Files
                </button>
            </div>
            {/* Input to choose and open file */}
            <input
                type="file"
                hidden
                onChange={onFileChange}
                ref={fileInputRef}
                accept={allowedFileExtensions}
            />
        </div>
    )
}

export default FilesTab