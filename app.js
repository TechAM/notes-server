const express = require("express")
const app = express()
const Note = require("./models/Note")

app.use(require("cors")())
app.use(express.json())

require("dotenv").config()
const mongoose = require("mongoose")
mongoose.connect(process.env.DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
const db = mongoose.connection
db.on("error", (error) => console.log(error))
db.once("open", () => console.log("Connected to database"))

app.get("/", (req, res) => {
    res.json({ message: "Hello World" })
})

app.get("/notes", async (req, res) => {
    const notes = await Note.find()
    res.send(notes)
})

app.get("/note/:id", async (req, res) => {
    const find_id = req.params.id
    const note = await Note.findOne({ id: find_id })
    res.json({ note: note })
})

app.post("/create_note", (req, res) => {
    const note = new Note({
        id: Math.round(Math.random() * 1000000),
        ...req.body,
    })
    note.save()
        .then((result) => res.json({ note: result }))
        .catch((err) => console.log(err))
})

app.post("/update_note/:id", async (req, res) => {
    const update_id = req.params.id
    const newText = req.body.text
    const newTitle = req.body.title
    const newPinned = req.body.pinned
    const updatedNote = await Note.findOneAndUpdate(
        { id: update_id },
        { title: newTitle, text: newText, pinned: newPinned },
        { new: true }
    )
    res.json({ note: updatedNote })
})

app.post("/delete_note", (req, res) => {
    const delete_id = req.body.id
    Note.deleteOne({ id: delete_id }).then((result) => res.json(result))
})

app.listen(5000)
