const express = require("express");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const cors = require('cors');
const path = require("path");

const app = express();

// Middleware
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.json());

const __dirname1 = path.resolve();
app.use(express.static(path.join(__dirname1, "public")));

// MongoDB Connection
const MONGODB_URI = "mongodb://127.0.0.1:27017/whatsapp_users";
const PORT = 3000;

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000,
}).then(() => {
    console.log('Connected to MongoDB successfully');
}).catch((err) => {
    console.error('MongoDB connection error:', err);
});

// Schemas
const userschema = new mongoose.Schema({
    name: { type: String, required: true },
    password: { type: String, required: true },
    socketid: String,
}, { timestamps: true });

const chatschema = new mongoose.Schema({
    to: { type: String, required: true },
    from: { type: String, required: true },
    message: { type: String, required: true },
}, { timestamps: true });

const user = mongoose.model("user", userschema);
const chat = mongoose.model("chat", chatschema);

// Routes
app.get("/", (req, res) => {
    res.render("home");
});

app.post("/signup", async (req, res) => {
    const { name, password } = req.body;
    try {
        const existingUser = await user.findOne({ name: name });
        let rem_users = await user.find({"name": {$ne: name}});
        
        if (existingUser) {
            if(existingUser.password === password){
                return res.render("index", { name, rem_users });
            }
            return res.status(400).json({ error: "User exists with different password" });
        }

        const newUser = new user({ name, password });
        await newUser.save();
        console.log(`User ${name} signed up successfully`);
        res.render("index", { name, rem_users });
    } catch (err) {
        console.error("Error during signup:", err);
        res.status(500).json({ error: "Error during signup" });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Socket.io setup
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST"]
    }
});

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("message", async (data) => {
        try {
            const existingUser = await user.findOne({ name: data.name });
            if (!existingUser) {
                return socket.emit("error", "User not found.");
            }
            existingUser.socketid = data.text;
            await existingUser.save();
            socket.emit("reply", "Database updated successfully!");
        } catch (error) {
            console.error("Error during connection:", error);
            socket.emit("error", "Something went wrong.");
        }
    });

    socket.on("details", async (data) => {
        if (!data?.to_name || !data?.from_name || !data?.from_id) {
            return console.error("Invalid data received in 'details' event:", data);
        }

        try {
            const to_user = await user.findOne({ name: data.to_name });
            if (!to_user) {
                return socket.emit("error", "Recipient user not found");
            }

            socket.to_user_name = to_user.name;
            socket.to_user_id = to_user.socketid;

            const tot_chats = await chat.find({
                $or: [
                    { to: data.to_name, from: data.from_name },
                    { from: data.to_name, to: data.from_name },
                ],
            }).sort({ _id: 1 });

            socket.emit("display-msg", { tot_chats });
        } catch (error) {
            console.error("Error fetching chat history:", error);
            socket.emit("error", "Error fetching chat history");
        }
    });

    socket.on("sending-msg", async (data1) => {
        try {
            if (!socket.to_user_id) {
                data1.chat_box = `${data1.name1}: ${data1.chat_box}`;
                return io.emit("receive-msg", data1.chat_box);
            }

            if (socket.to_user_name === data1.name1) {
                data1.chat_box = `${data1.name1}: ${data1.chat_box}`;
                io.emit("receive-msg", data1.chat_box);
            } else {
                const newchat = new chat({
                    to: socket.to_user_name,
                    from: data1.name1,
                    message: data1.chat_box
                });
                await newchat.save();
                socket.to(socket.to_user_id).emit("receiving-msg", data1.chat_box);
            }
        } catch (error) {
            console.error("Error sending message:", error);
            socket.emit("error", "Error sending message");
        }
    });

    socket.on("disconnect", () => {
        console.log("A user disconnected:", socket.id);
    });
});

// Handle process termination
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed');
            process.exit(0);
        });
    });
});