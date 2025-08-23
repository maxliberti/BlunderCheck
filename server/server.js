// setup

require('dotenv').config();
console.log('Environment Variables:', process.env);  // DEBUG

// Verify environment variable
if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is not defined in .env file');
}

const express = require('express');
const cors = require('cors');
const UserModel = require('./models/Users');

const app = express();
app.use(cors());
app.use(express.json());

// db
const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI;

async function connect_to_db() {
    try {
        await mongoose.connect(uri)
        console.log("Connected to MongoDB")
    } catch (error) {
        console.log(error);
    }
}

connect_to_db();

app.get('/', (req, res) => {
    UserModel.find({})
    .then(users => res.json(users))
    .catch(err => console.log(err));
})

app.get('/getUser/:id', (req, res) => {
    const id = req.params.id;
    UserModel.findById({_id:id})
    .then(users => res.json(users))
    .catch(err => console.log(err));
})

app.put('/updateUser/:id', (req, res) => {
    const id = req.params.id;
    UserModel.findByIdAndUpdate({_id: id}, {
            name: req.body.name,
            email: req.body.email,
            age: req.body.age})
    .then(users => res.json(users))
    .catch(err => console.log(err));
})

app.delete('/deleteUser/:id', (req, res) => {
    const id = req.params.id;
    UserModel.findByIdAndDelete({_id: id})
    .then(res => res.json(res))
    .catch(err => res.json(err));
})

// ??
app.post("/createUser", (req, res) => {
    UserModel.create(req.body)
    .then(users => res.json(users))
    .catch((err) => res.json(err))
})

app.listen(8080, () => {
    console.log("Server started on port 8080");
});