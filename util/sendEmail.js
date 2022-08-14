let nodemailer = require("nodemailer")
require("dotenv").config()

// let transporter = nodemailer.createTransport({
//     host: "smtp.mailtrap.io",
//     port: 2525,
//     auth: {
//         user: "b3578cc25ea47f",
//         pass: "d3fd6b77ed4fd8",
//     },
// })
let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: "softwaresolankis@gmail.com",
        pass: process.env.GMAIL_PASS,
    },
})

let mailOptions = {
    from: "softwaresolankis@gmail.com",
    to: "",
    subject: "Notes reset password link",
}

const sendResetLink = (to, link) => {
    mailOptions.to = to
    mailOptions.html = `
        Click <a href="${link}">here</a> to create a new password
        <p>If you did not make this request, ignore this email<p>

        <p>From the Notes team</p>
    `
    transporter.sendMail(mailOptions, (err, info) => {
        if (err) return console.log(err)
        console.log(`Email sent: ${info.response}`)
    })
}

module.exports = sendResetLink
