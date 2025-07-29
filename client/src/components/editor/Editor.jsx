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
    const [localContent, setLocalContent] = useState("")
    const [isUpdatingFromServer, setIsUpdatingFromServer] = useState(false)
    const editorRef = useRef(null)
    const lastServerContent = useRef("")
    const changeTimeout = useRef(null)
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
        // Don't emit if we're updating from server
        if (isUpdatingFromServer) return

        setLocalContent(code)
        
        // Clear existing timeout
        if (changeTimeout.current) {
            clearTimeout(changeTimeout.current)
        }
        
        // Debounce the server update
        changeTimeout.current = setTimeout(() => {
            const file = { ...currentFile, content: code }
            socket.emit(ACTIONS.FILE_UPDATED, { file })
        }, 100) // 100ms debounce for real-time feel
        
        // Send cursor position
        const cursorPosition = view.state?.selection?.main?.head
        if (cursorPosition !== undefined) {
            socket.emit(ACTIONS.CURSOR_UPDATE, { 
                position: cursorPosition,
                username: currentUser.username,
                fileId: currentFile?.id
            })
        }
    }, [currentFile, socket, currentUser.username, isUpdatingFromServer])

    // Listen for file updates from server
    const handleFileUpdateFromServer = useCallback(({ file, fromUser }) => {
        if (file.id === currentFile?.id && fromUser !== currentUser.username) {
            console.log('=== RECEIVING UPDATE FROM ===', fromUser)
            setIsUpdatingFromServer(true)
            setLocalContent(file.content)
            lastServerContent.current = file.content
            setCurrentFile(file)
            // Reset flag after a short delay
            setTimeout(() => setIsUpdatingFromServer(false), 50)
        }
    }, [currentFile?.id, setCurrentFile, currentUser.username])

    // Listen for events from server
    useEffect(() => {
        socket.on(ACTIONS.FILE_UPDATED, handleFileUpdateFromServer)
        
        return () => {
            socket.off(ACTIONS.FILE_UPDATED, handleFileUpdateFromServer)
        }
    }, [socket, handleFileUpdateFromServer])

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            if (changeTimeout.current) {
                clearTimeout(changeTimeout.current)
            }
        }
    }, [])

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
