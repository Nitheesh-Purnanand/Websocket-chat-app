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
    console.log("A user connected:", socket.id);
    socket.on("message", async (data) => {
        try {
            const existingUser = await user.findOne({ name: data.name });
            if (!existingUser) {
                socket.emit("error", "User not found.");
                return;
            }
            existingUser.socketid = data.text;
            await existingUser.save();
            socket.emit("reply", "Database updated successfully!");
        } catch (error) {
            socket.emit("error", "Something went wrong.");
        }
    });

    socket.on("send-msg", (chat_box) => {
        io.emit("receive-msg", chat_box);
    });

    socket.on("details", (data) => {
        if (data && data.to_name && data.from_name && data.from_id) {
            console.log("Details received:", data);
        } else {
            console.error("Invalid data received in 'details' event:", data);
        }
    });

    socket.on("disconnect", () => {
        console.log("A user disconnected:", socket.id);
    });
});



const userschema = new mongoose.Schema({
    name: String,
    password: String,
    socketid:String,
});
const chatschema = new mongoose.Schema({
    to:String,
    from:String,
    message:String,
})
const user = mongoose.model("user", userschema);
const chat = mongoose.model("chat",chatschema);
let newchat = new chat({to:"pranathi",from:"nitheesh",message:"buggies isthava ammaa"})
newchat.save()

app.post("/signup", async (req, res) => {
    const { name, password } = req.body;
    try {
        const existingUser = await user.findOne({ name: name });
        let rem_users = await user.find({"name": {$ne: name}})
        if (existingUser) {
            if(existingUser.password == password){
                res.render("index", { name , rem_users});
            }else{
            console.log(`User with name ${existingUser.name} already exists`);
            return res.status(400).send("User already exists");}
        }else{
        const newUser = new user({ name: name, password: password });
        await newUser.save();

        console.log(`User ${name} signed up successfully`);
        res.render("index", { name , rem_users});}
    } catch (err) {
        console.error("Error during signup:", err);
        res.status(500).send("Error during signup");
    }
});
// db.sample.find({"locations.vname": {$ne: "vij"}})