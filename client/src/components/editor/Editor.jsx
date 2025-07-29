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
    const [remoteCursors, setRemoteCursors] = useState(new Map())
    const editorRef = useRef(null)
    const lastServerContent = useRef("")
    const changeTimeout = useRef(null)
    const cursorTimeout = useRef(null)
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
        
        // Clear existing timeout
        if (changeTimeout.current) {
            clearTimeout(changeTimeout.current)
        }
        
        // Debounce the server update
        changeTimeout.current = setTimeout(() => {
            const file = { ...currentFile, content: code }
            socket.emit(ACTIONS.FILE_UPDATED, { file })
        }, 200) // 200ms debounce for real-time feel
        
        // Send cursor position immediately
        const cursorPosition = view.state?.selection?.main?.head
        if (cursorPosition !== undefined) {
            socket.emit(ACTIONS.CURSOR_UPDATE, { 
                position: cursorPosition,
                username: currentUser.username,
                fileId: currentFile?.id
            })
        }
    }, [currentFile, socket, currentUser.username])

    // Listen for file updates from server
    const handleFileUpdateFromServer = useCallback(({ file, fromUser }) => {
        if (file.id === currentFile?.id && fromUser !== currentUser.username) {
            // Only update if it's from another user
            setLocalContent(file.content)
            lastServerContent.current = file.content
            setCurrentFile(file)
        }
    }, [currentFile?.id, setCurrentFile, currentUser.username])

    // Listen for cursor updates from other users
    const handleCursorUpdate = useCallback(({ position, username, fileId }) => {
        if (fileId === currentFile?.id && username !== currentUser.username) {
            setRemoteCursors(prev => {
                const newCursors = new Map(prev)
                newCursors.set(username, { position, timestamp: Date.now() })
                return newCursors
            })
        }
    }, [currentFile?.id, currentUser.username])

    // Clean up old cursors
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now()
            setRemoteCursors(prev => {
                const newCursors = new Map()
                for (const [username, cursor] of prev) {
                    if (now - cursor.timestamp < 5000) { // 5 second timeout
                        newCursors.set(username, cursor)
                    }
                }
                return newCursors
            })
        }, 1000)

        return () => clearInterval(interval)
    }, [])

    // Listen for events from server
    useEffect(() => {
        socket.on(ACTIONS.FILE_UPDATED, handleFileUpdateFromServer)
        socket.on(ACTIONS.CURSOR_UPDATE, handleCursorUpdate)
        
        return () => {
            socket.off(ACTIONS.FILE_UPDATED, handleFileUpdateFromServer)
            socket.off(ACTIONS.CURSOR_UPDATE, handleCursorUpdate)
        }
    }, [socket, handleFileUpdateFromServer, handleCursorUpdate])

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            if (changeTimeout.current) {
                clearTimeout(changeTimeout.current)
            }
            if (cursorTimeout.current) {
                clearTimeout(cursorTimeout.current)
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
        <div className="relative w-full h-full">
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
            
            {/* Remote cursors */}
            {Array.from(remoteCursors.entries()).map(([username, cursor]) => (
                <div
                    key={username}
                    className="absolute pointer-events-none z-10"
                    style={{
                        left: `${(cursor.position % 80) * 8}px`, // Approximate position
                        top: `${Math.floor(cursor.position / 80) * 20}px`,
                    }}
                >
                    <div className="bg-blue-500 text-white text-xs px-1 py-0.5 rounded">
                        {username}
                    </div>
                    <div className="w-0.5 h-4 bg-blue-500 ml-1"></div>
                </div>
            ))}
        </div>
    )
}

export default Editor
