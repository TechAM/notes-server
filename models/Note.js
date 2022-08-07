const mongoose = require("mongoose")
const noteSchema = new mongoose.Schema(
    {
        id: {
            type: Number,
            required: true,
            unique: true,
        },
        text: {
            type: String,
            default: "",
        },
        title: {
            type: String,
            default: "",
        },
        pinned: {
            type: Boolean,
            required: true,
            default: false,
        },
        username: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
)

const Note = mongoose.model("Note", noteSchema)
module.exports = Note
