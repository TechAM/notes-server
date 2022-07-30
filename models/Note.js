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
        },
        title: {
            type: String,
        },
        pinned: {
            type: Boolean,
            required: true,
            default: false,
        },
    },
    { timestamps: true }
)

const Note = mongoose.model("Note", noteSchema)
module.exports = Note
