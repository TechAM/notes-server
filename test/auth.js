const User = require("../models/User")

let chai = require("chai")
let chaiHttp = require("chai-http")
let server = require("../app")

// Assertion style we will be using
chai.should()
chai.use(chaiHttp)

let expect = chai.expect

// creating a test using mocha - first have to describe the test
describe("Authentication routes", () => {
    const user = {
        username: "avi-new",
        email: "avi.mukesh@hotmail.com",
        password: "password",
    }
    // Test sign up
    describe("POST /auth/signup", () => {
        it("It should sign up user", (done) => {
            chai.request(server)
                .post("/auth/signup")
                .send(user)
                .end((err, response) => {
                    response.should.have.status(201)
                    response.body.should.be.a("object")
                    response.body.should.have.property("user")
                    response.body.user.should.have
                        .property("username")
                        .eq(user.username)
                    response.body.user.should.have
                        .property("email")
                        .eq(user.email)

                    done()
                })
        })

        it("It should not sign up the same user", (done) => {
            chai.request(server)
                .post("/auth/signup")
                .send(user)
                .end((err, response) => {
                    response.should.have.status(409)
                    response.body.should.be.a("object")
                    response.body.should.have
                        .property("message")
                        .eq("User with same username or email already exists")

                    done()
                })
        })
    })

    describe("POST /auth/signin", () => {
        it("It should sign in", (done) => {
            chai.request(server)
                .post("/auth/signin")
                .send({ username: user.username, password: user.password })
                .end((err, response) => {
                    response.should.have.status(200)
                    response.body.should.be.a("object")
                    response.body.should.have.property("accessToken")
                    expect(response.body.accessToken.length).to.be.greaterThan(
                        0
                    )

                    done()
                })
        })

        it("It shouldn't sign in because password is required", (done) => {
            chai.request(server)
                .post("/auth/signin")
                .send({ username: user.username, password: "" })
                .end((err, response) => {
                    response.should.have.status(400)
                    response.body.should.be.a("object")
                    response.body.should.have
                        .property("message")
                        .eq("Password is required")

                    done()
                })
        })

        it("It shouldn't sign in because username doesn't exist", (done) => {
            chai.request(server)
                .post("/auth/signin")
                .send({ username: "rubbish", password: "password" })
                .end((err, response) => {
                    response.should.have.status(401)
                    response.body.should.be.a("object")
                    response.body.should.have
                        .property("message")
                        .eq("No such user exists")

                    done()
                })
        })

        it("It shouldn't sign in because password is incorrect", (done) => {
            chai.request(server)
                .post("/auth/signin")
                .send({ username: "avi", password: "incorrectpassword" })
                .end((err, response) => {
                    response.should.have.status(401)
                    response.body.should.be.a("object")
                    response.body.should.have
                        .property("message")
                        .eq("Incorrect password")

                    done()
                })
        })
    })

    describe("DELETE /auth/signout", () => {
        it("Should sign the user out", (done) => {
            chai.request(server)
                .delete("/auth/signout")
                .end((err, response) => {
                    response.should.have.status(200)
                    response.body.should.have
                        .property("message")
                        .eq("Signed out")
                })
        })
    })

    after((done) => {
        chai.request(server)
            .delete("/auth/delete_user")
            .send({ username: user.username })
            .end((err, response) => {
                response.should.have.status(200)
                response.body.should.be.a("object")
                response.body.should.have.property("user")

                done()
            })
    })
})
