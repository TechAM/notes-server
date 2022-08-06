const express = require("express")
const bcrypt = require("bcrypt")
const router = express.Router()

const User = require("./models/User")

router.get("/test", (req, res) => {
    res.send("/auth route is working!!!")
})

router.post("/signup", async (req, res) => {
    console.log("signing up...")
    const { username, email, password } = req.body
    console.log(username)
    const hashedPassword = await bcrypt.hash(password, 10)
    const user = new User({
        username: username,
        email: email,
        password: hashedPassword,
    })
    console.log(user)
    user.save()
        .then((result) => {
            {
                console.log("Created user")
                return res.status(201).json({ user: result })
            }
        })
        .catch((err) => {
            res.status(500).json({ message: err.message })
        })
})

router.post("/signin", (req, res) => {
    console.log("signing in...")
    res.json({ message: "signing in..." })
})

module.exports = router
