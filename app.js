const express = require("express")
const app = express()
const jwt = require("jsonwebtoken")
const cookieParser = require("cookie-parser")
const authRouter = require("./authRouter")

const Note = require("./models/Note")
app.set("json spaces", 2)

// specify cors config because if we want to allow credentials then Access-Control-Allow-Origin must not use *
app.use(require("cors")({ credentials: true, origin: "http://localhost:3000" }))
app.use(cookieParser())
app.use(express.json())
app.use("/auth", authRouter)

// require("dotenv").config()
const mongoose = require("mongoose")
mongoose.connect(process.env.DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
const db = mongoose.connection
db.on("error", (error) => console.log(error))
db.once("open", () => console.log("Connected to database"))

app.get("/", (_req, res) => {
    console.log("Hello world")
    res.json({ message: "Hello World" })
})

app.get("/notes", authenticateToken, async (req, res) => {
    try {
        const notes = await Note.find()
        let userNotes = notes.filter(
            (note) => note.username == req.user.username
        )
        // filter posts based on user
        res.send(userNotes)
    } catch (err) {
        return res
            .status(500)
            .json({ message: "Server error: couldn't load notes" })
    }
})

app.get("/note/:id", authenticateToken, async (req, res) => {
    try {
        const find_id = req.params.id
        const note = await Note.findOne({ id: find_id })
        if (note.username == req.user.username) return res.json({ note: note })
        return res
            .status(401)
            .json({ message: "Unauthorized: note belongs to different user" })
    } catch (err) {
        return res
            .status(500)
            .json({ message: "Server error: couldn't load note" })
    }
})

app.post("/create_note", authenticateToken, (req, res) => {
    try {
        const note = new Note({
            id: Math.round(Math.random() * 1000000),
            ...req.body,
            username: req.user.username,
        })
        note.save()
            .then((result) => {
                return res.json({ note: result })
            })
            .catch((err) =>
                res
                    .status(500)
                    .json({ message: "Server error: couldnt create note" })
            )
    } catch (err) {
        res.status(500).json({ message: "Server error: coudln't create note" })
    }
})

app.post("/update_note/:id", authenticateToken, async (req, res) => {
    const update_id = req.params.id
    const newText = req.body.text
    const newTitle = req.body.title
    const newPinned = req.body.pinned

    try {
        const note = await Note.findOne({ id: update_id })
        if (note.username == req.user.username) {
            let updatedNote
            try {
                updatedNote = await Note.findOneAndUpdate(
                    { id: update_id },
                    { title: newTitle, text: newText, pinned: newPinned },
                    { new: true }
                )
            } catch (err) {
                return res
                    .status(500)
                    .json({ message: "Server error: couldn't update note" })
            }

            res.json({ note: updatedNote })
        } else {
            return res
                .status(401)
                .json({ message: "Unauthorized: can't update note" })
        }
    } catch (err) {
        return res
            .status(500)
            .json({ message: "Server error: couldn't update note" })
    }
})

app.post("/delete_note", authenticateToken, async (req, res) => {
    const delete_id = req.body.id

    try {
        const note = await Note.findOne({ id: delete_id })
        if (note.username == req.user.username) {
            Note.deleteOne({ id: delete_id })
                .then((result) => {
                    return res.json(result)
                })
                .catch((err) => res.status(500).json({ message: err }))
        } else {
            return res
                .status(401)
                .json({ message: "Unauthorized: can't delete" })
        }
    } catch (err) {
        return res
            .status(500)
            .json({ message: "Server error: couldn't delete note" })
    }
})

// this is my custom middleware for the protected routes
function authenticateToken(req, res, next) {
    // get token, verify it's the correct user

    // Bearer TOKEN is the form of the authorization header
    const authHeader = req.headers["authorization"]
    const token = authHeader && authHeader.split(" ")[1]
    if (token == null) {
        return res.status(401).json({ message: "Unauthorized: no token" })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        // 403 means we see u have a token but it's no longer valid
        if (err) {
            return res
                .status(403)
                .json({ message: "Forbidden: token has expired" })
        }

        req.user = user
        next()
    })
}

// exporting this so we can use chai to test the server
module.exports = app.listen(process.env.PORT || 5000)
