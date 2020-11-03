const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const cors = require('cors');
const path = require('path')

const { addUser, removeUser, getUser, getUsersInRoom } = require('./users.js');

const port = process.env.PORT || 5000;

// const router = require('./router')

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(cors());
// app.use(router)
// Serve any static files
app.use(express.static(path.join(__dirname, 'client/build')));
// Handle React routing, return all requests to React app;
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});


io.on('connection', (socket) => {
    socket.on('join', ({ name, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, name, room });

        if (error) return callback(error);

        socket.emit('message', { user: 'admin', text: `${user.name}, welcome to room ${user.room}.` });
        socket.broadcast.to(user.room).emit('message', { user: 'admin', text: `${user.name}, has joined!` });

        socket.join(user.room);

        io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });

        callback();
    });

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id);

        io.to(user.room).emit('message', { user: user.name, text: message });


        callback();
    });

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', { user: 'admin', text: `${user.name} has left.` });
            io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });
        }
    })
});


server.listen(port, () => console.log(`Server has started.`));

