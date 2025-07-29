const express = require("express")
const app = express()
const http = require("http")
const cors = require("cors")
const ACTIONS = require("./utils/actions")

// Get port from environment variable or default to 5000
const PORT = process.env.PORT || 5000

// CORS configuration for production
const allowedOrigins = [
  "http://localhost:5173",
  "https://your-client-domain.vercel.app" // Replace with your actual Vercel domain
]

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type"],
  credentials: true
}));

app.use(express.json())

const { Server } = require("socket.io")

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true
  }
})

let userSocketMap = []
const breakoutRooms = new Map(); // key: breakoutRoomId, value: { id, name, users: [], parentRoomId }

// Map to store code/files per room (main and breakout)
const roomFiles = new Map(); // key: roomId or breakoutRoomId, value: { files, currentFile }

const roomMasterMap = new Map(); // key: roomId, value: masterUsername

function getUsersInRoom(roomId) {
  return userSocketMap.filter((user) => user.roomId == roomId)
}

function getRoomId(socketId) {
  const user = userSocketMap.find((user) => user.socketId === socketId)
  return user?.roomId
}

function isRoomMaster(roomId, socketId) {
  const user = userSocketMap.find((user) => user.socketId === socketId)
  return user?.isRoomMaster && user?.roomId === roomId
}

// Helper to get active roomId for a user (main or breakout)
function getActiveRoomId(user) {
    return user.breakoutRoomId || user.roomId;
}

io.on("connection", (socket) => {
	// Handle user actions
	socket.on(ACTIONS.JOIN_REQUEST, ({ roomId, username }) => {
		// Remove any old socket for this username in this room
		userSocketMap = userSocketMap.filter(
			u => !(u.roomId === roomId && u.username === username)
		)
		// Persistent master logic
		let masterUsername = roomMasterMap.get(roomId);
		const usersInRoom = getUsersInRoom(roomId);
		let isRoomMaster = false;
		if (!masterUsername) {
			// User pertama, set sebagai master
			masterUsername = username;
			roomMasterMap.set(roomId, masterUsername);
			isRoomMaster = true;
		} else if (username === masterUsername) {
			isRoomMaster = true;
		}
		// Debug log
		console.log('[JOIN_REQUEST]', { username, roomId, isRoomMaster, masterUsername, usersInRoom: usersInRoom.map(u => ({ username: u.username, isRoomMaster: u.isRoomMaster, socketId: u.socketId })) });
		// Check is username exist in the room
		const isUsernameExist = usersInRoom.filter(
			(u) => u.username === username
		)
		if (isUsernameExist.length > 0) {
			io.to(socket.id).emit(ACTIONS.USERNAME_EXISTS)
			return
		}
		const user = {
			username,
			roomId,
			status: ACTIONS.USER_ONLINE,
			cursorPosition: 0,
			typing: false,
			socketId: socket.id,
			currentFile: null,
			isRoomMaster,
			breakoutRoomId: null // Track which breakout room user is in
		}
		userSocketMap.push(user)
		socket.join(roomId)
		socket.broadcast.to(roomId).emit(ACTIONS.USER_JOINED, { user })
		const users = getUsersInRoom(roomId)
		io.to(socket.id).emit(ACTIONS.JOIN_ACCEPTED, { user, users })
		// Debug log after join
		console.log('[AFTER JOIN]', userSocketMap.filter(u => u.roomId === roomId).map(u => ({ username: u.username, isRoomMaster: u.isRoomMaster, socketId: u.socketId })))

		// After join, sync code space for main room
		const activeRoomId = roomId;
		if (!roomFiles.has(activeRoomId)) {
			roomFiles.set(activeRoomId, { files: [], currentFile: null });
		}
		io.to(socket.id).emit(ACTIONS.SYNC_FILES, roomFiles.get(activeRoomId));
	})

	// --- BREAKOUT ROOM EVENTS ---
	socket.on("CREATE_BREAKOUT_ROOM", ({ parentRoomId, name }, cb) => {
		// Only master can create
		const user = userSocketMap.find((u) => u.socketId === socket.id)
		if (!user || !user.isRoomMaster) return cb && cb({ error: "Not allowed" })
		const breakoutRoomId = `breakout_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
		breakoutRooms.set(breakoutRoomId, {
			id: breakoutRoomId,
			name,
			users: [],
			parentRoomId
		})
		cb && cb({ id: breakoutRoomId, name })
		// Notify all users in main room
		io.to(parentRoomId).emit("BREAKOUT_ROOMS_LIST", { rooms: Array.from(breakoutRooms.values()).filter(r => r.parentRoomId === parentRoomId) })
	})

	socket.on("GET_BREAKOUT_ROOMS", ({ parentRoomId }, cb) => {
		const rooms = Array.from(breakoutRooms.values()).filter(r => r.parentRoomId === parentRoomId)
		cb && cb({ rooms })
	})

	socket.on("ASSIGN_TO_BREAKOUT_ROOM", ({ userSocketId, breakoutRoomId }, cb) => {
		const master = userSocketMap.find((u) => u.socketId === socket.id)
		if (!master || !master.isRoomMaster) return cb && cb({ error: "Not allowed" })
		const user = userSocketMap.find((u) => u.socketId === userSocketId)
		const breakoutRoom = breakoutRooms.get(breakoutRoomId)
		if (!user || !breakoutRoom) return cb && cb({ error: "User or room not found" })
		// Remove from previous breakout room
		if (user.breakoutRoomId) {
			const prevRoom = breakoutRooms.get(user.breakoutRoomId)
			if (prevRoom) prevRoom.users = prevRoom.users.filter(u => u.socketId !== userSocketId)
		}
		user.breakoutRoomId = breakoutRoomId
		breakoutRoom.users.push(user)
		cb && cb({ success: true })
		io.to(userSocketId).emit("ASSIGNED_TO_BREAKOUT_ROOM", { breakoutRoomId, name: breakoutRoom.name })
		io.to(breakoutRoomId).emit("BREAKOUT_ROOM_JOINED", { user, users: breakoutRoom.users })
	})

	socket.on("JOIN_BREAKOUT_ROOM", ({ breakoutRoomId }, cb) => {
		const user = userSocketMap.find((u) => u.socketId === socket.id)
		const breakoutRoom = breakoutRooms.get(breakoutRoomId)
		if (!user || !breakoutRoom) return cb && cb({ error: "User or room not found" })
		socket.join(breakoutRoomId)
		user.breakoutRoomId = breakoutRoomId
		// Remove duplicate user
		breakoutRoom.users = breakoutRoom.users.filter(u => u.socketId !== user.socketId)
		breakoutRoom.users.push(user)
		cb && cb({ success: true })
		io.to(breakoutRoomId).emit("BREAKOUT_ROOM_JOINED", { user, users: breakoutRoom.users })
		// Sync code space for this breakout room
		if (!roomFiles.has(breakoutRoomId)) {
			roomFiles.set(breakoutRoomId, { files: [], currentFile: null });
		}
		io.to(socket.id).emit(ACTIONS.SYNC_FILES, roomFiles.get(breakoutRoomId));
		// Broadcast updated breakout rooms list to all users in parentRoomId
		io.to(breakoutRoom.parentRoomId).emit("BREAKOUT_ROOMS_LIST", { rooms: Array.from(breakoutRooms.values()).filter(r => r.parentRoomId === breakoutRoom.parentRoomId) })
	})

	socket.on("LEAVE_BREAKOUT_ROOM", ({ breakoutRoomId }, cb) => {
		const user = userSocketMap.find((u) => u.socketId === socket.id)
		const breakoutRoom = breakoutRooms.get(breakoutRoomId)
		if (!user || !breakoutRoom) return cb && cb({ error: "User or room not found" })
		socket.leave(breakoutRoomId)
		breakoutRoom.users = breakoutRoom.users.filter(u => u.socketId !== socket.id)
		user.breakoutRoomId = null
		// Join back to main room
		socket.join(user.roomId);
		cb && cb({ success: true })
		io.to(breakoutRoomId).emit("BREAKOUT_ROOM_LEFT", { user, users: breakoutRoom.users })
		// Sync code space for main room
		if (!roomFiles.has(user.roomId)) {
			roomFiles.set(user.roomId, { files: [], currentFile: null });
		}
		io.to(socket.id).emit(ACTIONS.SYNC_FILES, roomFiles.get(user.roomId));
		// Broadcast updated breakout rooms list to all users in parentRoomId
		io.to(breakoutRoom.parentRoomId).emit("BREAKOUT_ROOMS_LIST", { rooms: Array.from(breakoutRooms.values()).filter(r => r.parentRoomId === breakoutRoom.parentRoomId) })
	})

	socket.on("CLOSE_BREAKOUT_ROOM", ({ breakoutRoomId }) => {
		const roomMaster = userSocketMap.find((u) => u.socketId === socket.id)
		if (!roomMaster || !roomMaster.isRoomMaster) return

		const breakoutRoom = breakoutRooms.get(breakoutRoomId)
		if (!breakoutRoom) return

		// Move all users back to main room
		breakoutRoom.users.forEach(user => {
			user.breakoutRoomId = null
			io.to(user.socketId).emit("BREAKOUT_ROOM_CLOSED")
		})

		// Remove breakout room
		breakoutRooms.delete(breakoutRoomId)
		io.to(breakoutRoom.parentRoomId).emit("BREAKOUT_ROOM_CLOSED", {
			breakoutRoomId
		})
	})

	// Remove duplicate GET_BREAKOUT_ROOMS handler - the working one is above

	socket.on("disconnecting", () => {
		const user = userSocketMap.find((user) => user.socketId === socket.id)
		const roomId = user?.roomId
		if (roomId === undefined || user === undefined) return
		// Persistent master: do NOT promote other users to master
		socket.broadcast.to(roomId).emit(ACTIONS.USER_DISCONNECTED, { user })
		userSocketMap = userSocketMap.filter((u) => u.socketId !== socket.id)
		socket.leave()
		// Debug log after disconnect
		console.log('[AFTER DISCONNECT]', userSocketMap.filter(u => u.roomId === roomId).map(u => ({ username: u.username, isRoomMaster: u.isRoomMaster, socketId: u.socketId })))
	})

	// --- FILE/CODE EVENTS ---
	socket.on(ACTIONS.SYNC_FILES, ({ files, currentFile }) => {
		const user = userSocketMap.find((u) => u.socketId === socket.id);
		const activeRoomId = getActiveRoomId(user);
		if (!roomFiles.has(activeRoomId)) {
			roomFiles.set(activeRoomId, { files: [], currentFile: null });
		}
		roomFiles.set(activeRoomId, { files, currentFile });
		// Broadcast only to users in the same room
		socket.to(activeRoomId).emit(ACTIONS.SYNC_FILES, { files, currentFile });
	})

	socket.on(ACTIONS.FILE_CREATED, ({ file }) => {
		const user = userSocketMap.find((u) => u.socketId === socket.id);
		const activeRoomId = getActiveRoomId(user);
		if (!roomFiles.has(activeRoomId)) {
			roomFiles.set(activeRoomId, { files: [], currentFile: null });
		}
		const roomState = roomFiles.get(activeRoomId);
		roomState.files.push(file);
		socket.to(activeRoomId).emit(ACTIONS.FILE_CREATED, { file });
	})

	socket.on(ACTIONS.FILE_UPDATED, ({ file }) => {
		const user = userSocketMap.find((u) => u.socketId === socket.id);
		const activeRoomId = getActiveRoomId(user);
		if (!roomFiles.has(activeRoomId)) {
			roomFiles.set(activeRoomId, { files: [], currentFile: null });
		}
		const roomState = roomFiles.get(activeRoomId);
		const idx = roomState.files.findIndex(f => f.id === file.id);
		if (idx !== -1) roomState.files[idx] = file;
		socket.to(activeRoomId).emit(ACTIONS.FILE_UPDATED, { file });
	})

	socket.on(ACTIONS.FILE_RENAMED, ({ file }) => {
		const user = userSocketMap.find((u) => u.socketId === socket.id);
		const activeRoomId = getActiveRoomId(user);
		if (!roomFiles.has(activeRoomId)) {
			roomFiles.set(activeRoomId, { files: [], currentFile: null });
		}
		const roomState = roomFiles.get(activeRoomId);
		const idx = roomState.files.findIndex(f => f.id === file.id);
		if (idx !== -1) roomState.files[idx] = file;
		socket.to(activeRoomId).emit(ACTIONS.FILE_RENAMED, { file });
	})

	socket.on(ACTIONS.FILE_DELETED, ({ id }) => {
		const user = userSocketMap.find((u) => u.socketId === socket.id);
		const activeRoomId = getActiveRoomId(user);
		if (!roomFiles.has(activeRoomId)) {
			roomFiles.set(activeRoomId, { files: [], currentFile: null });
		}
		const roomState = roomFiles.get(activeRoomId);
		roomState.files = roomState.files.filter(f => f.id !== id);
		socket.to(activeRoomId).emit(ACTIONS.FILE_DELETED, { id });
	})

	// Handle user status
	socket.on(ACTIONS.USER_OFFLINE, ({ socketId }) => {
		userSocketMap = userSocketMap.map((user) => {
			if (user.socketId === socketId) {
				return { ...user, status: ACTIONS.USER_OFFLINE }
			}
			return user
		})
		const roomId = getRoomId(socketId)
		socket.broadcast.to(roomId).emit(ACTIONS.USER_OFFLINE, { socketId })
	})

	socket.on(ACTIONS.USER_ONLINE, ({ socketId }) => {
		userSocketMap = userSocketMap.map((user) => {
			if (user.socketId === socketId) {
				return { ...user, status: ACTIONS.USER_ONLINE }
			}
			return user
		})
		const roomId = getRoomId(socketId)
		socket.broadcast.to(roomId).emit(ACTIONS.USER_ONLINE, { socketId })
	})

	// Handle chat actions
	socket.on(ACTIONS.SEND_MESSAGE, ({ message }) => {
		const roomId = getRoomId(socket.id)
		socket.broadcast.to(roomId).emit(ACTIONS.RECEIVE_MESSAGE, { message })
	})

	// Handle cursor position
	socket.on(ACTIONS.TYPING_START, ({ cursorPosition }) => {
		userSocketMap = userSocketMap.map((user) => {
			if (user.socketId === socket.id) {
				return { ...user, typing: true, cursorPosition }
			}
			return user
		})
		const user = userSocketMap.find((user) => user.socketId === socket.id)
		const roomId = user.roomId
		socket.broadcast.to(roomId).emit(ACTIONS.TYPING_START, { user })
	})

	socket.on(ACTIONS.TYPING_PAUSE, () => {
		userSocketMap = userSocketMap.map((user) => {
			if (user.socketId === socket.id) {
				return { ...user, typing: false }
			}
			return user
		})
		const user = userSocketMap.find((user) => user.socketId === socket.id)
		const roomId = user.roomId
		socket.broadcast.to(roomId).emit(ACTIONS.TYPING_PAUSE, { user })
	})
})

app.get("/", (req, res) => {
	res.send("Hello")
})

server.listen(PORT, () => {
	console.log(`Listening on port ${PORT}`)
})