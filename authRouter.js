const sendResetLink = require("./util/sendEmail")

const express = require("express")
const bcrypt = require("bcrypt")
const router = express.Router()
const jwt = require("jsonwebtoken")

const User = require("./models/User")

router.get("/test", (req, res) => {
    res.send("/auth route is working!!!")
})

// when a field (username, email, password) is empty, this function sends a response message to client
function fieldRequired(field, res) {
    res.status(400).json({ message: `${field} is required` })
}

router.get("/users", async (req, res) => {
    try {
        const users = await User.find()
        res.json({ users })
    } catch (err) {
        res.status(500).json({ message: "Error: couldn't get all users" })
    }
})

router.post("/signup", async (req, res) => {
    const { username, email, password } = req.body

    if (!username) return fieldRequired("Username", res)
    if (!email) return fieldRequired("Email", res)
    if (!password) return fieldRequired("Password", res)

    User.find()
        .or([{ username }, { email }])
        .then(async (result) => {
            // if no user with this username and email exists
            if (!result.length) {
                // 10 is the saltRounds value - higher the number the more time it takes to hash
                const hashedPassword = await bcrypt.hash(password, 10)
                const user = new User({
                    username: username,
                    email: email,
                    password: hashedPassword,
                })
                return saveUser(user, res, "Server error: couldn't create user")
            } else {
                // 409 means conflict
                return res.status(409).json({
                    message: "User with same username or email already exists",
                })
            }
        })
        .catch((err) => {
            res.status(500).json({
                message: "Server error: couldn't create user",
            })
        })
})

router.post("/signin", async (req, res) => {
    const { username, password } = req.body

    // 400 means bad request
    if (!username) return fieldRequired("Username", res)
    if (!password) return fieldRequired("Password", res)

    // 401 means unauthorised
    try {
        const user = await User.findOne({ username })
        if (!user)
            return res.status(401).json({ message: "No such user exists" })

        console.log(user)
        const match = await bcrypt.compare(password, user.password)

        console.log(match)
        if (match) {
            const accessToken = generateAccessToken(user)
            const refreshToken = generateRefreshToken(user)

            user.refreshToken = refreshToken

            console.log(accessToken)
            console.log(refreshToken)


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
                    res.status(500).json({
                        message: "Server error: couldn't send tokens",
                    })
                })
        } else {
            res.status(401).json({ message: "Incorrect password" })
        }
    } catch (err) {
        return res.json({ message: "Server error: couldn't sign in" })
    }
})

router.delete("/signout", (_req, res) => {
    // clear the refreshtoken from the cookie
    // with no refresh token we can't get new access token
    try {
        res.clearCookie("refreshtoken", { path: "/auth/refresh_token" })
        return res.status(200).json({ message: "Signed out" })
    } catch (err) {
        return res
            .status(500)
            .json({ message: "Server error: couldn't sign out" })
    }
})
const generateAccessToken = (user) => {
    return generateToken(user, process.env.ACCESS_TOKEN_SECRET, "10m")
}
const generateRefreshToken = (user) => {
    return generateToken(user, process.env.REFRESH_TOKEN_SECRET, "7d")
}
const generateToken = (user, secret, expiresIn) => {
    let obj = { username: user.username }
    return jwt.sign(obj, secret, { expiresIn })
}

router.post("/refresh_token", (req, res) => {
    const refreshTokenCookie = req.cookies.refreshtoken
    // if we don't have a token in our request e.g. we've signed out (which clears the refreshtoken cookie)
    if (!refreshTokenCookie) return res.json({ accessToken: "" })
    // we have a token, let's verify it
    let payload = null
    try {
        payload = jwt.verify(
            refreshTokenCookie,
            process.env.REFRESH_TOKEN_SECRET
        )
    } catch (err) {
        return res.status(401).json({ accessToken: "" })
    }

    // token is valid so check if user with this refreshToken exists
    User.findOne({ username: payload.username }, (err, user) => {
        if (user.refreshToken !== refreshTokenCookie) {
            return res.status(404).json({ accessToken: "" })
        }
        // a user with this valid refresh token exists, so generate a new accessToken for this user
        const accessToken = generateAccessToken(user)
        return res.json({ accessToken: accessToken })
    })
})

router.post("/forgot_password", async (req, res) => {
    const email = req.body.email
    try {
        const user = await User.findOne({ email })
        if (!user)
            return res.status(401).json({ message: "No such user exists" })

        // With the combination of the user’s password hash and created date
        // the JWT will become a one-time-use token, because once the user has changed their password
        // it will generate a new password hash invalidating the secret key that references the old password.
        const secret = user.password + user.createdAt
        const token = jwt.sign({ email }, secret)
        const link = `http://localhost:3000/reset_password/${user._id}/${token}`
        sendResetLink(email, link)
    } catch (err) {
        return res.status(500).json({
            message: "Server error: couldn't send reset password link",
        })
    }
    res.json({ message: "resetting" })
})

router.post("/reset_password", async (req, res) => {
    const { id, token, newPassword } = req.body

    try {
        const user = await User.findById(id)
        if (!user)
            return res.status(401).json({ message: "No such user exists" })

        // because we're using the user's current password as part of the secret, once the password has been changed
        // this secret won't be able to verify the same token anymore
        // hence making the password reset link invalid
        const secret = user.password + user.createdAt
        let payload
        try {
            payload = jwt.verify(token, secret)
        } catch (err) {
            return res
                .status(403)
                .json({ message: "Password reset link is old" })
        }

        // we get the user with this specified id
        // we get the user that is represented by this token - if the jwt verificiation fails that means there's been some tampering with something
        // and we make sure that they are the same
        if (payload.email != user.email)
            return res
                .status(403)
                .json({ message: "Unauthorized: can't change password" })

        const hashedPassword = await bcrypt.hash(newPassword, 10)
        user.password = hashedPassword
        return saveUser(user, res, "Server error: couldn't reset password")
    } catch (err) {
        return res
            .status(500)
            .json({ message: "Server error: couldn't reset password" })
    }
})

router.delete("/delete_user", async (req, res) => {
    const { username } = req.body

    try {
        const user = await User.findOneAndDelete({ username })
        res.json({ user })
    } catch (err) {
        res.status(500).json({ message: "Error: couldn't delete user" })
    }
})

function saveUser(user, res, errMessage) {
    user.save()
        .then((user) => {
            return res.status(201).json({ user })
        })
        .catch((err) => {
            return res.status(500).json({ message: errMessage })
        })
}

module.exports = router
