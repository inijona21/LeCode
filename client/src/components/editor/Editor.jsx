import useAppContext from "@/hooks/useAppContext"
import useFileSystem from "@/hooks/useFileSystem"
import usePageEvents from "@/hooks/usePageEvents"
import useSetting from "@/hooks/useSetting"
import useSocket from "@/hooks/useSocket"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import { editorThemes } from "@/resources/Themes"
import ACTIONS from "@/utils/actions"
import placeholder from "@/utils/editorPlaceholder"
import { color } from "@uiw/codemirror-extensions-color"
import { hyperLink } from "@uiw/codemirror-extensions-hyper-link"
import { loadLanguage } from "@uiw/codemirror-extensions-langs"
import CodeMirror from "@uiw/react-codemirror"
import { useState, useRef, useCallback, useEffect } from "react"
import toast from "react-hot-toast"
import { cursorTooltipBaseTheme, tooltipField } from "./tooltip"

function Editor() {
    const { users, currentUser } = useAppContext()
    const { currentFile, setCurrentFile } = useFileSystem()
    const { theme, language, fontSize } = useSetting()
    const { socket } = useSocket()
    const { tabHeight } = useWindowDimensions()
    const [timeOut, setTimeOut] = useState(null)
    const [isUpdatingFromServer, setIsUpdatingFromServer] = useState(false)
    const editorRef = useRef(null)
    const filteredUsers = users.filter(
        (u) => u.username !== currentUser.username,
    )

    const onCodeChange = useCallback((code, view) => {
        // Don't emit if we're updating from server
        if (isUpdatingFromServer) return

        const file = { ...currentFile, content: code }
        setCurrentFile(file)
        
        // Debounce the server update
        clearTimeout(timeOut)
        const newTimeOut = setTimeout(() => {
            socket.emit(ACTIONS.FILE_UPDATED, { file })
        }, 300) // 300ms debounce
        setTimeOut(newTimeOut)
        
        const cursorPosition = view.state?.selection?.main?.head
        socket.emit(ACTIONS.TYPING_START, { cursorPosition })
        
        // Clear typing timeout
        clearTimeout(timeOut)
        const typingTimeOut = setTimeout(
            () => socket.emit(ACTIONS.TYPING_PAUSE),
            1000,
        )
        setTimeOut(typingTimeOut)
    }, [currentFile, socket, timeOut, isUpdatingFromServer])

    // Listen for file updates from server
    const handleFileUpdateFromServer = useCallback(({ file }) => {
        if (file.id === currentFile?.id) {
            setIsUpdatingFromServer(true)
            setCurrentFile(file)
            // Reset flag after a short delay
            setTimeout(() => setIsUpdatingFromServer(false), 50)
        }
    }, [currentFile?.id, setCurrentFile])

    // Listen for FILE_UPDATED events from server
    useEffect(() => {
        socket.on(ACTIONS.FILE_UPDATED, handleFileUpdateFromServer)
        
        return () => {
            socket.off(ACTIONS.FILE_UPDATED, handleFileUpdateFromServer)
        }
    }, [socket, handleFileUpdateFromServer])

    // Listen wheel event to zoom in/out and prevent page reload
    usePageEvents()

    const getExtensions = () => {
        const extensions = [
            color,
            hyperLink,
            tooltipField(filteredUsers),
            cursorTooltipBaseTheme,
        ]
        const langExt = loadLanguage(language.toLowerCase())
        if (langExt) {
            extensions.push(langExt)
        } else {
            toast.error("Syntax Highlighting not available for this language")
        }
        return extensions
    }

    return (
        <CodeMirror
            ref={editorRef}
            placeholder={placeholder(currentFile.name)}
            mode={language.toLowerCase()}
            theme={editorThemes[theme]}
            onChange={onCodeChange}
            value={currentFile.content}
            extensions={getExtensions()}
            minHeight="100%"
            maxWidth="100vw"
            style={{
                fontSize: fontSize + "px",
                height: tabHeight,
                position: "relative",
            }}
        />
    )
}

export default Editor
