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
    const [localContent, setLocalContent] = useState("")
    const [isTyping, setIsTyping] = useState(false)
    const editorRef = useRef(null)
    const lastServerContent = useRef("")
    const filteredUsers = users.filter(
        (u) => u.username !== currentUser.username,
    )

    // Update local content when currentFile changes
    useEffect(() => {
        if (currentFile?.content !== undefined) {
            setLocalContent(currentFile.content)
            lastServerContent.current = currentFile.content
        }
    }, [currentFile?.id, currentFile?.content])

    const onCodeChange = useCallback((code, view) => {
        setLocalContent(code)
        setIsTyping(true)
        
        // Debounce the server update
        clearTimeout(timeOut)
        const newTimeOut = setTimeout(() => {
            const file = { ...currentFile, content: code }
            socket.emit(ACTIONS.FILE_UPDATED, { file })
            setIsTyping(false)
        }, 500) // 500ms debounce
        setTimeOut(newTimeOut)
        
        const cursorPosition = view.state?.selection?.main?.head
        socket.emit(ACTIONS.TYPING_START, { cursorPosition })
        
        // Clear typing timeout
        const typingTimeOut = setTimeout(
            () => socket.emit(ACTIONS.TYPING_PAUSE),
            1000,
        )
        setTimeOut(typingTimeOut)
    }, [currentFile, socket, timeOut])

    // Listen for file updates from server
    const handleFileUpdateFromServer = useCallback(({ file }) => {
        if (file.id === currentFile?.id && !isTyping) {
            // Only update if content is different and user is not typing
            if (file.content !== lastServerContent.current) {
                setLocalContent(file.content)
                lastServerContent.current = file.content
                setCurrentFile(file)
            }
        }
    }, [currentFile?.id, setCurrentFile, isTyping])

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
            placeholder={placeholder(currentFile?.name)}
            mode={language.toLowerCase()}
            theme={editorThemes[theme]}
            onChange={onCodeChange}
            value={localContent}
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
