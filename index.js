const express = require("express");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const app = express();

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

mongoose
    .connect("mongodb://127.0.0.1:27017/whatsapp_users")
    .then(() => console.log("Connection successful"))
    .catch((err) => console.error("Database connection error:", err));

app.get("/", (req, res) => {
    res.render("home");
});

const server = app.listen(3000, () => {
    console.log("App is listening on port 3000");
});

const io = new Server(server);

io.on("connection", (socket) => {
    console.log("A user connected");
    socket.on("message", (data) => {
        console.log("Message received:", data);
        socket.emit("reply", "Hello from the server!");
    });
    socket.on("disconnect", () => {
        console.log("A user disconnected");
    });
});

const userschema = new mongoose.Schema({
    name: String,
    password: String,
});

const user = mongoose.model("user", userschema);

app.post("/signup", async (req, res) => {
    const { name, password } = req.body;
    try {
        const existingUser = await user.findOne({ name: name });
        if (existingUser) {
            console.log(`User with name ${name} already exists`);
            return res.status(400).send("User already exists");
        }
        const newUser = new user({ name: name, password: password });
        await newUser.save();

        console.log(`User ${name} signed up successfully`);
        res.render("view", { name });
    } catch (err) {
        console.error("Error during signup:", err);
        res.status(500).send("Error during signup");
    }
});
