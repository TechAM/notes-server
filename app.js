const express = require("express")
const app = express()
const authRouter = require("./authRouter")

const Note = require("./models/Note")
app.set("json spaces", 2)

app.use(require("cors")())
app.use(express.json())
app.use("/auth", authRouter)

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
    console.log("Sent notes")
    const notes = await Note.find()
    res.send(notes)
})

app.get("/note/:id", async (req, res) => {
    console.log("Sending one note")
    const find_id = req.params.id
    const note = await Note.findOne({ id: find_id })
    res.json({ note: note })
})

app.post("/create_note", (req, res) => {
    console.log("Creating note...")
    const note = new Note({
        id: Math.round(Math.random() * 1000000),
        ...req.body,
    })
    note.save()
        .then((result) => {
            console.log("Created note")
            return res.json({ note: result })
        })
        .catch((err) => res.status(500).json({ message: err }))
})

app.post("/update_note/:id", async (req, res) => {
    console.log("Updating note...")
    const update_id = req.params.id
    const newText = req.body.text
    const newTitle = req.body.title
    const newPinned = req.body.pinned
    let updatedNote
    try {
        updatedNote = await Note.findOneAndUpdate(
            { id: update_id },
            { title: newTitle, text: newText, pinned: newPinned },
            { new: true }
        )
        console.log("Updated")
    } catch (err) {
        return res.status(500).json({ message: err })
    }

    res.json({ note: updatedNote })
})

app.post("/delete_note", (req, res) => {
    console.log("Deleting note...")
    const delete_id = req.body.id
    Note.deleteOne({ id: delete_id })
        .then((result) => {
            console.log("Deleted note")
            return res.json(result)
        })
        .catch((err) => res.status(500).json({ message: err }))
})

app.listen(process.env.PORT || 5000)
