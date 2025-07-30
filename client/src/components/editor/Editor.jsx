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
import { useState, useEffect, useRef } from "react"
import toast from "react-hot-toast"
import { cursorTooltipBaseTheme, tooltipField } from "./tooltip"

function Editor() {
    const { users, currentUser } = useAppContext()
    const { currentFile, setCurrentFile } = useFileSystem()
    const { theme, language, fontSize } = useSetting()
    const { socket } = useSocket()
    const { tabHeight } = useWindowDimensions()
    const [timeOut, setTimeOut] = useState(null)
    const [content, setContent] = useState(currentFile?.content || '')
    const [isUpdating, setIsUpdating] = useState(false)
    const updateTimeoutRef = useRef(null)
    const filteredUsers = users.filter(
        (u) => u.username !== currentUser.username,
    )

    // Update content when currentFile changes
    useEffect(() => {
        if (currentFile?.content !== content && !isUpdating) {
            setContent(currentFile?.content || '');
        }
    }, [currentFile?.content, content, isUpdating]);

    const onCodeChange = (code, view) => {
        // Update local content immediately
        setContent(code);
        setIsUpdating(true);
        
        // Clear previous timeout
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
        }
        
        // Debounce file updates to reduce conflicts
        updateTimeoutRef.current = setTimeout(() => {
            const file = { ...currentFile, content: code };
            setCurrentFile(file);
            
            console.log('=== SENDING DEBOUNCED FILE UPDATE ===', { 
                fileId: file.id, 
                contentLength: code.length,
                username: currentUser.username,
                timestamp: Date.now()
            });
            
            socket.emit(ACTIONS.FILE_UPDATED, { file });
            setIsUpdating(false);
        }, 300); // Reduced to 300ms for better responsiveness
        
        // Send typing status
        const cursorPosition = view.state?.selection?.main?.head
        socket.emit(ACTIONS.TYPING_START, { cursorPosition })
        clearTimeout(timeOut)
        const newTimeOut = setTimeout(
            () => socket.emit(ACTIONS.TYPING_PAUSE),
            1000,
        )
        setTimeOut(newTimeOut)
    }

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
        <div style={{ position: 'relative', height: '100%' }}>
            {isUpdating && (
                <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    padding: '5px 10px',
                    borderRadius: '5px',
                    fontSize: '12px',
                    zIndex: 1000
                }}>
                    Saving...
                </div>
            )}
            <CodeMirror
                placeholder={placeholder(currentFile.name)}
                mode={language.toLowerCase()}
                theme={editorThemes[theme]}
                onChange={onCodeChange}
                value={content}
                extensions={getExtensions()}
                minHeight="100%"
                maxWidth="100vw"
                style={{
                    fontSize: fontSize + "px",
                    height: tabHeight,
                    position: "relative",
                }}
            />
        </div>
    )
}

export default Editor
