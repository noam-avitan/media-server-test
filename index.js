const { App } = require('uWebSockets.js');
const { Server } = require("socket.io");

// Create a µWebSockets.js app instance
const app = new App();

// Socket.IO configuration (including CORS settings)
const socketConfig = {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        transports: ['websocket', 'polling'],
        credentials: true
    }
};

// Create a Socket.IO server instance and attach it to the µWebSockets.js app
const io = new Server(socketConfig);
io.attachApp(app);

// Define a simple route using µWebSockets.js (handler signature: (res, req))
app.get('/', (res, req) => {
    res.writeHeader('Content-Type', 'text/plain');
    res.end('WebSocket server is running');
});

// Start the µWebSockets.js server on the desired port
const port = process.env.PORT || 8080;
app.listen(port, (token) => {
    if (token) {
        console.log(`Server running on port ${port}`);
    } else {
        console.error(`Failed to listen on port ${port}`);
        // If we failed to listen on the provided port, don't try another port
        // This will make the problem more obvious rather than silently continuing
        process.exit(1);
    }
});

// Socket.IO event handlers
io.on('connection', function (socket) {
    console.log('a user connected');

    socket.on('disconnect', function (reason) {
        console.log('disconnect: User disconnected because ' + reason);
    });

    socket.on('initiate user', clientId => throwableEvent(() => {
        console.log('initiate user: User has joined room: ' + clientId);
        socket.join(clientId);
    }));

    socket.on('JoinRoom', clientId => throwableEvent(() => {
        console.log('JoinRoom: User has joined room: ' + clientId);
        socket.join(clientId);
    }));

    socket.on('LeaveRoom', clientId => throwableEvent(() => {
        console.log('LeaveRoom: User has Left room: ' + clientId);
        socket.leave(clientId, (err) => throwableEvent(() => {
            console.log(err);
        }));
    }));

    socket.on('OnUserLeft', jsonedString => throwableEvent(() => {
        const data = JSON.parse(jsonedString);
        io.to(data.roomId).emit('OnUserLeft', jsonedString, { broadcast: true });
    }));

    socket.on('SendTexture', (data) => {
        if (data) {
            if (data instanceof Buffer) {
                const roomId = data.readUInt32LE(0);
                io.to(roomId).emit('GetTexture', data, { broadcast: true });
            } else {
                console.error('Invalid message format: expected a Buffer object');
            }
        } else {
            console.error('Received null or undefined message');
        }
    });

    socket.onAny(async (eventName, data) => {
        if (!(data instanceof Buffer)) return;
        if (eventName.includes('dynamic')) {
            io.to(eventName).emit('GetTexture', data, { broadcast: true });
        } else if (eventName.includes('DataMessage')) {
            const parts = eventName.split('-');
            if (parts.length > 1) {
                const [, roomId] = parts;
                io.to(roomId).emit('OnDataMessage', data, { broadcast: true });
            }
        } else if (eventName.includes('resize')) {

        }
    });

    socket.on('OnShareScreenStarted', jsonedString => throwableEvent(() => {
        let data;
        try {
            data = JSON.parse(jsonedString);
        } catch (e) {
            data = jsonedString;
        }
        console.log('share screen started ' + data.roomId);
        io.to(data.roomId).emit('OnShareScreenStarted', jsonedString, { broadcast: true });
    }));

    socket.on('OnRoomMessage', jsonedString => throwableEvent(() => {
        let data;
        try {
            data = JSON.parse(jsonedString);
        } catch (e) {
            data = jsonedString;
        }
        io.to(data.roomId).emit('OnRoomMessage', jsonedString, { broadcast: true });
    }));

    socket.on('OnHeartbeat', jsonedString => throwableEvent(() => {
        const data = JSON.parse(jsonedString);
        console.log(jsonedString);
        io.to(data.roomId).emit('OnHeartbeat', jsonedString, { broadcast: true });
    }));

    socket.on('RoomMessage', jsonedString => throwableEvent(() => {
        const data = JSON.parse(jsonedString);
        console.log('Room Message: ' + jsonedString);
        io.to(data.roomId).emit('RoomMessage', jsonedString, { broadcast: true });
    }));

    socket.on('RequestKeyframe', jsonedString => throwableEvent(() => {
        const data = JSON.parse(jsonedString);
        console.log('RequestKeyframe: ' + jsonedString);
        io.to(data.roomId).emit('RequestKeyframe', jsonedString, { broadcast: true });
    }));

    socket.on('error', function (er) {
        console.log('catcher: ' + er);
        console.log(er);
    });
});


function throwableEvent(callback) {
    try {
        callback();
    } catch (e) {
        console.error(new Date() + ':', e);
    }
}
