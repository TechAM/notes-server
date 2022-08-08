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

    // 400 means bad request
    if (!username)
        return res.status(400).json({ message: "Username is required" })
    if (!password)
        return res.status(400).json({ message: "Password is required" })

    console.log("trying to sign in", username)

    // 401 means unauthorised
    const user = await User.findOne({ username: username })
    if (!user) return res.status(401).json({ message: "No such user exists" })

    const match = await bcrypt.compare(password, user.password)
    if (match) {
        const accessToken = generateAccessToken(user.toJSON())
        const refreshToken = generateRefreshToken(user.toJSON())

        user.refreshToken = refreshToken
        user.save()
            .then((user) => {
                // send accessToken as a normal response
                res.cookie("refreshtoken", refreshToken, {
                    httpOnly: true,
                    // path because we don't want to send this cookie along with every single request
                    // only on the /refresh_token endpoint which is when we want to get a new access token with our refresh token
                    path: "/auth/refresh_token",
                })
                return res.json({ accessToken: accessToken })
            })
            .catch((err) => {
                res.status(500).json({ message: "Server error sending tokens" })
            })

        console.log(`${username} is signed in`, accessToken)
    } else {
        res.status(401).json({ message: "Incorrect password" })
    }
})

const generateAccessToken = (userObj) => {
    return jwt.sign(userObj, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "10m",
    })
}

const generateRefreshToken = (userObj) => {
    return jwt.sign(userObj, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: "7d",
    })
}

router.post("/signout", (req, res) => {
    // clear the refreshtoken from the cookie
    // with no refresh token we can't get new access token
    console.log("Signing out")
    res.clearCookie("refreshtoken")
    return res.status(200).json({ message: "Signed out" })
})

router.post("/refresh_token", (req, res) => {
    const refreshTokenCookie = req.cookies.refreshtoken
    // if we don't have a token in our request
    if (!refreshTokenCookie) return res.json({ accessToken: "" })
    // we have a token, let's verify it
    let payload = null
    console.log("refreshing token")
    try {
        payload = jwt.verify(
            refreshTokenCookie,
            process.env.REFRESH_TOKEN_SECRET
        )
    } catch (err) {
        return res.status(401).json({ accessToken: "" })
    }

    // token is valid so check if user exists
    User.findOne({ id: payload.id }, (err, user) => {
        if (user.refreshToken !== refreshTokenCookie) {
            return res.status(404).json({ accessToken: "" })
        }

        // to stop the tokens from getting longer and longer after each refresh
        user.refreshToken = ""
        user.save().then(() => {
            const accessToken = generateAccessToken(user.toJSON())
            const refreshToken = generateRefreshToken(user.toJSON())
            user.refreshToken = refreshToken
            user.save().then((user) => {
                console.log(refreshToken)

                res.cookie("refreshtoken", refreshToken, {
                    httpOnly: true,
                    // path because we don't want to send this cookie along with every single request
                    // only on the /refresh_token endpoint which is when we want to get a new access token with our refresh token
                    path: "/auth/refresh_token",
                })
                return res.json({ accessToken: accessToken })
            })
        })
    })

    // token exists, create new access and refresh token
})

module.exports = router
