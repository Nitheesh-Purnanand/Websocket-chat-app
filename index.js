const express = require("express");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const app = express();
const path = require("path")
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

const __dirname1 = path.resolve()
app.use(express.static(path.join(__dirname1,"public")))

mongoose.connect("mongodb://127.0.0.1:27017/whatsapp_users", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000, // Increase timeout
});


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
            console.error("Error during connection:", error);
            socket.emit("error", "Something went wrong.");
        }
    });
    socket.on("details", async (data) => {
        if (data && data.to_name && data.from_name && data.from_id) {
            try {
                let to_user = await user.findOne({ name: data.to_name });
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
            }
        } else {
            console.error("Invalid data received in 'details' event:", data);
        }
    });

    socket.on("sending-msg",async (data1) => {
        if (socket.to_user_id) {
            // console.log(data1)
            // console.log(socket.to_user_id,data1.name1);
            if(socket.to_user_name === data1.name1){
                data1.chat_box = data1.name1 + " : " + data1.chat_box; 
                io.emit("receive-msg", data1.chat_box);
            }
            else{
                let newchat = new chat({to: socket.to_user_name ,from: data1.name1 ,message: data1.chat_box})
                await newchat.save()
            // data1.chat_box = data1.name1 + " : " + data1.chat_box; 
            socket.to(socket.to_user_id).emit("receiving-msg", data1.chat_box);}
        } else {
            data1.chat_box = data1.name1 + " : " + data1.chat_box; 
            io.emit("receive-msg", data1.chat_box);
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