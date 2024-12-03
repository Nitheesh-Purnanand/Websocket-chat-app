const express = require("express");
const app = express();
const mongoose = require("mongoose");

app.set("view engine","ejs")
app.use(express.static('public'))
app.use(express.urlencoded({extended:true}))
main().then(()=>{console.log("connection successful");}).catch((err)=>{console.log(err)})
async function main() {
await mongoose.connect("mongodb://127.0.0.1:27017/whatsapp_users");}

app.get("/",(req,res)=>{
    res.render("home.ejs");})
app.listen("3000",()=>{
    console.log("app is listening");})
const chatschema = new mongoose.Schema({
    from:String,
    to:String,
})
const chat = mongoose.model("chat",chatschema);
let chat1 = new chat({from:"nitheesh",to:"pranathi"});
chat1.save();