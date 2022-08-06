const express = require("express")
const bcrypt = require("bcrypt")
const router = express.Router()
const jwt = require("jsonwebtoken")

const User = require("./models/User")

router.get("/test", (req, res) => {
    res.send("/auth route is working!!!")
})

router.post("/signup", async (req, res) => {
    console.log("signing up...")
    const { username, email, password } = req.body

    if (!username)
        return res.status(400).json({ message: "Username is required" })
    if (!email) return res.status(400).json({ message: "Email is required" })
    if (!password)
        return res.status(400).json({ message: "Password is required" })

    User.find()
        .or([{ username: username }])
        .then(async (result) => {
            console.log("Existing users: ", result)
            if (!result.length) {
                const hashedPassword = await bcrypt.hash(password, 10)
                const user = new User({
                    username: username,
                    email: email,
                    password: hashedPassword,
                })
                console.log("Saving user")
                user.save()
                    .then((result) => {
                        {
                            console.log("Created and saved user")
                            return res.status(201).json({ user: result })
                        }
                    })
                    .catch((err) => {
                        res.status(500).json({ message: err.message })
                    })
            } else {
                console.log("User already exists")
                // 409 means conflict
                return res.status(409).json({ message: "User already exists" })
            }
        })
        .catch((err) => {
            console.log("Interval server error")
            res.status(500).json({ message: err.message })
        })
})

router.post("/signin", async (req, res) => {
    const { username, password } = req.body
    console.log("trying to sign in", username)

    // 400 means bad request
    if (!username)
        return res.status(400).json({ message: "Username is required" })
    if (!password)
        return res.status(400).json({ message: "Password is required" })

    // 401 means unauthorised
    const user = await User.findOne({ username: username })
    if (!user) return res.status(401).json({ message: "No such user exists" })

    const match = await bcrypt.compare(password, user.password)
    if (match) {
        // create JWTs
        //  require("crypto").randomBytes(64).toString("hex")
        const accessToken = jwt.sign(
            user.toJSON(),
            process.env.ACCESS_TOKEN_SECRET
        )
        console.log("User is logged in", accessToken)
        res.json({ accessToken: accessToken })
    } else {
        res.status(401).json({ user: user })
    }
})

module.exports = router
