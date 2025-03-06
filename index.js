const { App } = require('uWebSockets.js');
const { Server } = require("socket.io");

const app = new App();

const socketConfig = {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        transports: ['websocket', 'polling'],
        credentials: true
    }
};

const io = new Server(socketConfig);
io.attachApp(app);

app.get('/', (res, req) => {
    res.writeHeader('Content-Type', 'text/plain');
    res.end('WebSocket server is running');
});

console.log('Environment variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);

// Convert port to a number and use 8080 as fallback
const portStr = process.env.PORT || '8080';
const port = parseInt(portStr, 10);

console.log(`Attempting to listen on port ${port} (parsed from "${portStr}")`);

// Start the µWebSockets.js server on the desired port
app.listen(port, (token) => {
    if (token) {
        console.log(`Server running successfully on port ${port}`);
    } else {
        console.error(`Failed to listen on port ${port}`);

        // Try one more approach - on some platforms, port 0 means "assign me any available port"
        if (port !== 0) {
            console.log('Trying alternative approach with port 0...');
            app.listen(0, (backupToken) => {
                if (backupToken) {
                    console.log('Server running on a dynamically assigned port');
                } else {
                    console.error('Failed to listen on any port. Exiting.');
                    process.exit(1);
                }
            });
        } else {
            console.error('Cannot start server. Exiting.');
            process.exit(1);
        }
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
