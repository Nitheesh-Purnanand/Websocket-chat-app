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
    // console.log("A user connected:", socket.id);
    socket.on("message", async (data) => {
        try {
            const existingUser = await user.findOne({ name: data.name });
            console.log(`a user with name ${data.name} is connected`)
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

    socket.on("details", async (data) => {
        if (data && data.to_name && data.from_name && data.from_id) {
            // console.log("Details received:", data);
            let to_user = await user.findOne({ name: data.to_name });
            console.log(to_user)
            if (to_user) {
                socket.to_user_name = to_user.name;
                socket.to_user_id = to_user.socketid; // Store the recipient's socket ID for later use
            } else {
                console.error("Recipient user not found:", data.to_name);
            }
        } else {
            console.error("Invalid data received in 'details' event:", data);
        }
    });
    
    socket.on("sending-msg",async (data1) => {
        if (socket.to_user_id) {
            console.log(data1)
            // console.log(socket.to_user_id,data1.name1);
            if(socket.to_user_name === data1.name1){
                data1.chat_box = data1.name1 + " : " + data1.chat_box; 
                io.emit("receive-msg", data1.chat_box);
            }
            else{
                console.log(socket.to_user_name ,data1.name1 ,data1.chat_box)
                let newchat = new chat({to: socket.to_user_name ,from: data1.name1 ,message: data1.chat_box})
                await newchat.save()
                let tot_pvt_chat =await chat.find({"from":data1.name1 , "to":socket.to_user_name})
                console.log(tot_pvt_chat)
            data1.chat_box = data1.name1 + " : " + data1.chat_box; 
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