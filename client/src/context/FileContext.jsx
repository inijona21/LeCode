import useAppContext from "@/hooks/useAppContext"
import useSetting from "@/hooks/useSetting"
import useSocket from "@/hooks/useSocket"
import ACTIONS from "@/utils/actions"
import initialFile from "@/utils/initialFile"
import { saveAs } from "file-saver"
import JSZip from "jszip"
import langMap from "lang-map"
import PropTypes from "prop-types"
import { createContext, useCallback, useEffect, useRef, useState } from "react"
import { toast } from "react-hot-toast"
import { v4 as uuidv4 } from "uuid"

const FileContext = createContext()

function FileContextProvider({ children }) {
    const { socket } = useSocket()
    const { setLanguage } = useSetting()
    const { setUsers, activeRoomId } = useAppContext()
    // Map: roomId -> { files, currentFile }
    const [roomFileMap, setRoomFileMap] = useState(() => new Map())
    // Local state for current room
    const [files, setFiles] = useState([initialFile])
    const [currentFile, setCurrentFile] = useState(initialFile)
    // Track last activeRoomId to avoid unnecessary resets
    const lastRoomIdRef = useRef("")

    // Helper: update roomFileMap for current room
    const updateRoomFileMap = (roomId, files, currentFile) => {
        setRoomFileMap(prev => {
            const newMap = new Map(prev)
            newMap.set(roomId, { files, currentFile })
            return newMap
        })
    }

    // On activeRoomId change, update files/currentFile to that room
    useEffect(() => {
        if (!activeRoomId) return
        // Save current state to map before switching
        if (lastRoomIdRef.current && lastRoomIdRef.current !== activeRoomId) {
            updateRoomFileMap(lastRoomIdRef.current, files, currentFile)
        }
        // Load state for new room
        const roomState = roomFileMap.get(activeRoomId)
        if (roomState) {
            setFiles(roomState.files)
            setCurrentFile(roomState.currentFile)
        } else {
            setFiles([initialFile])
            setCurrentFile(initialFile)
        }
        lastRoomIdRef.current = activeRoomId
    }, [activeRoomId])

    const createFile = (name) => {
        let num = 1
        let fileExists = files.some((file) => file.name === name)
        while (fileExists) {
            name = `${name} (${num++})`
            fileExists = files.some((file) => file.name === name)
            if (!fileExists) break
        }
        const id = uuidv4()
        const file = { id, name, content: "" }
        setFiles((prev) => [...prev, file])
        // File created event sent to server
        socket.emit(ACTIONS.FILE_CREATED, { file })
        return id
    }

    const updateFile = (id, content) => {
        setFiles((prev) =>
            prev.map((file) => {
                if (file.id === id) {
                    file.content = content
                }
                return file
            }),
        )
        // File updated event sent to server
    }

    const openFile = (id) => {
        if (currentFile) {
            updateFile(currentFile.id, currentFile.content)
        }
        const file = files.find((file) => file.id === id)
        setCurrentFile(file)
    }

    const renameFile = (id, newName) => {
        const fileExists = files.some((file) => file.name === newName)
        if (fileExists) {
            return false
        }
        setFiles((prev) =>
            prev.map((file) => {
                if (file.id === id) {
                    file.name = newName
                }
                return file
            }),
        )
        const file = { id, name: newName }
        socket.emit(ACTIONS.FILE_RENAMED, { file })
        return true
    }

    const deleteFile = (id) => {
        setFiles((prev) => prev.filter((file) => file.id !== id))
        if (currentFile.id === id) {
            setCurrentFile(null)
        }
        socket.emit(ACTIONS.FILE_DELETED, { id })
    }

    const downloadCurrentFile = () => {
        const blob = new Blob([currentFile.content], {
            type: "text/plain;charset=utf-8",
        })
        saveAs(blob, currentFile.name)
    }

    const downloadAllFiles = () => {
        const zip = new JSZip()
        files.forEach((file) => {
            const blobFile = new Blob([file.content], {
                type: "text/plain;charset=utf-8",
            })
            zip.file(file.name, blobFile)
        })
        zip.generateAsync({ type: "blob" }).then(function (content) {
            saveAs(content, "LeCode-Files.zip")
        })
    }

    // --- SOCKET EVENT HANDLERS (per room) ---
    const handleUserJoined = useCallback(
        ({ user }) => {
            toast.success(`${user.username} joined the room`)
            // send the code to the server (for this room only)
            socket.emit(ACTIONS.SYNC_FILES, {
                files,
                currentFile,
                socketId: user.socketId,
            })
            setUsers((pre) => {
                return [...pre, user]
            })
        },
        [currentFile, files, setUsers, socket],
    )

    const handleFileSync = useCallback(({ files, currentFile }) => {
        setFiles(files)
        setCurrentFile(currentFile)
    }, [])

    const handleFileRenamed = useCallback(({ file }) => {
        setFiles((prev) =>
            prev.map((f) => {
                if (f.id === file.id) {
                    f.name = file.name
                }
                return f
            }),
        )
    }, [])

    const handleFileDeleted = useCallback(
        ({ id }) => {
            setFiles((prev) => prev.filter((file) => file.id !== id))
            if (currentFile.id === id) {
                setCurrentFile(null)
            }
        },
        [currentFile?.id],
    )

    const handleFileCreated = useCallback(({ file }) => {
        setFiles((prev) => [...prev, file])
    }, [])

    const handleFileUpdated = useCallback(
        ({ file }) => {
            console.log('=== RECEIVED FILE UPDATE ===', { 
                fileId: file.id, 
                currentFileId: currentFile?.id,
                contentLength: file.content?.length || 0
            });
            
            setFiles((prev) =>
                prev.map((f) => {
                    if (f.id === file.id) {
                        f.content = file.content
                    }
                    return f
                }),
            )
            if (currentFile?.id === file.id) {
                console.log('=== UPDATING CURRENT FILE ===', file.name);
                setCurrentFile(file)
            }
        },
        [currentFile?.id],
    )

    useEffect(() => {
        if (currentFile === null) return
        // Get file extension on file open and set language when file is opened
        const language = langMap.languages(currentFile.name.split(".").pop())
        setLanguage(language[0])
    }, [currentFile, setLanguage])

    useEffect(() => {
        socket.once(ACTIONS.SYNC_FILES, handleFileSync)
        socket.on(ACTIONS.USER_JOINED, handleUserJoined)
        socket.on(ACTIONS.FILE_CREATED, handleFileCreated)
        socket.on(ACTIONS.FILE_UPDATED, handleFileUpdated)
        socket.on(ACTIONS.FILE_RENAMED, handleFileRenamed)
        socket.on(ACTIONS.FILE_DELETED, handleFileDeleted)

        return () => {
            socket.off(ACTIONS.USER_JOINED)
            socket.off(ACTIONS.FILE_CREATED)
            socket.off(ACTIONS.FILE_UPDATED)
            socket.off(ACTIONS.FILE_RENAMED)
            socket.off(ACTIONS.FILE_DELETED)
        }
    }, [
        handleFileCreated,
        handleFileDeleted,
        handleFileRenamed,
        handleFileSync,
        handleFileUpdated,
        handleUserJoined,
        socket,
    ])

    return (
        <FileContext.Provider
            value={{
                files,
                setFiles,
                currentFile,
                setCurrentFile,
                createFile,
                updateFile,
                openFile,
                renameFile,
                deleteFile,
                downloadCurrentFile,
                downloadAllFiles,
            }}
        >
            {children}
        </FileContext.Provider>
    )
}

FileContextProvider.propTypes = {
    children: PropTypes.node.isRequired,
}

export { FileContextProvider }
export default FileContext
