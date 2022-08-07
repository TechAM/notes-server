const express = require("express")
const app = express()
const jwt = require("jsonwebtoken")
const authRouter = require("./authRouter")

const Note = require("./models/Note")
app.set("json spaces", 2)

app.use(require("cors")())
app.use(express.json())
app.use("/auth", authRouter)

require("dotenv").config()
const mongoose = require("mongoose")
const { authenticate } = require("passport")
mongoose.connect(process.env.DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
const db = mongoose.connection
db.on("error", (error) => console.log(error))
db.once("open", () => console.log("Connected to database"))

app.get("/", (req, res) => {
    console.log("Hello world")
    res.json({ message: "Hello World" })
})

app.get("/notes", authenticateToken, async (req, res) => {
    // console.log("Sent notes to", req.user.username)
    const notes = await Note.find()
    let userNotes = notes.filter((note) => note.username == req.user.username)
    // filter posts based on user
    // console.log(notes)
    res.send(userNotes)
})

app.get("/note/:id", authenticateToken, async (req, res) => {
    console.log("Sending one note")
    const find_id = req.params.id
    const note = await Note.findOne({ id: find_id })
    if (note.username == req.user.username) return res.json({ note: note })
    console.log("unauthorized: note belongs to different user")
    return res
        .status(401)
        .json({ message: "Unauthorized, note belongs to different user" })
})

app.post("/create_note", authenticateToken, (req, res) => {
    console.log("Creating note...")
    const note = new Note({
        id: Math.round(Math.random() * 1000000),
        ...req.body,
        username: req.user.username,
    })
    note.save()
        .then((result) => {
            console.log("Created note")
            return res.json({ note: result })
        })
        .catch((err) => res.status(500).json({ message: err }))
})

app.post("/update_note/:id", authenticateToken, async (req, res) => {
    console.log("Updating note...")
    const update_id = req.params.id
    const newText = req.body.text
    const newTitle = req.body.title
    const newPinned = req.body.pinned

    const note = await Note.findOne({ id: update_id })
    if (note.username == req.user.username) {
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
    } else {
        return res.status(401).json({ message: "Unauthorized: can't update" })
    }
})

app.post("/delete_note", authenticateToken, async (req, res) => {
    const delete_id = req.body.id
    console.log("Deleting note...", delete_id)

    const note = await Note.findOne({ id: delete_id })
    if (note.username == req.user.username) {
        Note.deleteOne({ id: delete_id })
            .then((result) => {
                console.log("Deleted note")
                return res.json(result)
            })
            .catch((err) => res.status(500).json({ message: err }))
    } else {
        console.log("unauthorised can't delete")
        return res.status(401).json({ message: "Unauthorized: can't delete" })
    }
})

function authenticateToken(req, res, next) {
    // get token, verify it's the correct user

    //Bearer TOKEN si the form of the authorization header
    const authHeader = req.headers["authorization"]
    const token = authHeader && authHeader.split(" ")[1]
    // console.log(req.headers)
    if (token == null) {
        console.log("unauthorised")
        return res.status(401).json({ message: "Unauthorized: no token" })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        // 403 means we see u have a token but it's no longer valid
        if (err) {
            // console.log(err)
            return res.status(403).json({ message: err.message })
        }

        req.user = user
        next()
    })
}

app.listen(process.env.PORT || 5000)
