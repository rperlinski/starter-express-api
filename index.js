require('dotenv').config()

var express = require('express');
var bodyParser = require('body-parser');
var app = express();

// import OpenAI from "openai";
const OpenAI = require('openai');
// const openai = new OpenAI();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })


app.set('view engine', 'pug');
app.set('port', (process.env.PORT || 5000));

app.all('/*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  // res.header("Access-Control-Allow-Headers", "X-Requested-With");
  // res.header('Access-Control-Allow-Headers: Content-Type');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type,Authorization')
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const uri = process.env.MONGO_CONNECTION_STRING;

mongoose.connect(uri, function(err) {
    if(err) {
        console.log('connection error', err);
    } else {
        console.log('connection successful');
    }
});


const jwt_key = process.env.JWT_KEY;

const userSchema = mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: {type: String},
  password: { type: String, required: true }
});
userSchema.plugin(uniqueValidator);
var User = mongoose.model('User', userSchema)

function checkAuth(req, res, next) {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, jwt_key);
    req.userData = { email: decodedToken.email, userId: decodedToken.userId };
    next();
  } catch(error) {
    res.status(401).json({
      message: "Nie jesteś uwierzytelniony."
    });
  }
};

function ValidateEmail(email) {
  // if(typeof email == "string") console.log("String value");
  // else console.log("Not a string");
  // console.log("EMAIL: " + email);
  var mailformat = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  if(email.match(mailformat)) {
    // console.log("true");
    return true;
  } else {
    // console.log("false");
    return false;
  }
}


var UsersAPISchema = new mongoose.Schema({
  name: String,
  surname: String,
  age: { type: Number, default: 21 }
});
var UsersAPI = mongoose.model('apiusers', UsersAPISchema);


var CarsAPISchema = new mongoose.Schema({
  brand: String,
  model: String,
  year: { type: Number, default: 2025 }
});
var CarsAPI = mongoose.model('apicars', CarsAPISchema);




app.get('/', function (req, res) {
  res.render('index', { title: 'REST API' })
})

app.get('/hello', function(req, res, next) {
  res.send("Hello World form Czestochowa :D");
});


////////////////////////////////////////////////////////////////////////////////
// signup, login routes
////////////////////////////////////////////////////////////////////////////////



app.post("/signup", function(req, res, next) {
  console.log("email: " + req.body.email);
  console.log("password: " + req.body.password);
  // res.send("POST na /signup");
  if( ValidateEmail(req.body.email)==false ) {
    res.status(500).json({
      message: "Niepoprawny adres e-mail."
    });
    return;
  }
  bcrypt.hash(req.body.password, 10)
    .then( hash=> {
      const user = new User({
        email: req.body.email,
        username: req.body.email,
        password: hash
      });
      user.save()
        .then( result => {
          res.status(201).json({
            message: "Urzytkownik utworzony.",
            result: result
          });
        })
        .catch( err => {
          res.status(500).json({
            message: "Niepoprawne dane do rejestracji.",
            err
          });
        });
      });
  }
);

app.post("/login", function(req, res, next) {
  let fetchedUser;
  let responceSent = false;
  User.findOne({ email: req.body.email })
    .then(user => {
      // console.log(user);
      if(!user) {
        responceSent = true;
        return res.status(401).json({
          message: "Uwierzytelnienie nieprawidłowe 1."
        });
      }
      fetchedUser = user;
      return bcrypt.compare(req.body.password, user.password);
    })
    .then( result => {
      // console.log(result);
      if(!result) {
        responceSent = true;
        return res.status(401).json({
          message: "Uwierzytelnienie nieprawidłowe 2."
        });
      }
      const token = jwt.sign(
        {email: fetchedUser.email, userId: fetchedUser._id},
        jwt_key, {expiresIn: 5400}
      );
      // console.log(token);
      res.status(200).json({
        token: token,
        expiresIn: 5400,
        userId: fetchedUser._id
      });
    })
    .catch( err => {
      // console.log("ERROR");
      console.log(err);
      if(responceSent) { return; }
      return res.status(401).json({
        message: "Niepoprawne dane uwierzytelniające przy logowaniu."
      });
    });
});

/* GET /signed-users listing. */
app.get('/signed-users', function(req, res, next) {
  User.find(function (err, data) {
    if (err) return next(err);
    res.json(data);
  });
});

/* DELETE /remove-users to remove all signed users */
app.delete('/remove-users', function(req, res, next) {
  User.deleteMany({},function (err, data) {
    if (err) return next(err);
    res.json(data);
  });
});



////////////////////////////////////////////////////////////////////////////////
// users collection
////////////////////////////////////////////////////////////////////////////////

/* GET /users listing. */
app.get('/users', function(req, res, next) {
  UsersAPI.find(function (err, data) {
    if (err) return next(err);
    res.json(data);
  });
});

/* POST /users */
app.post('/users', function(req, res, next) {
  // console.log(req);
  UsersAPI.create(req.body, function (err, data) {
    if (err) return next(err);
    // console.log(JSON.stringify(data));
    res.json(data);
  });
});

/* GET /users/:id */
app.get('/users/:id', function(req, res, next) {
  UsersAPI.findById(req.params.id, function (err, data) {
    if (err) return next(err);
    res.json(data);
  });
});

/* PUT /users/:id */
app.put('/users/:id', function(req, res, next) {
  UsersAPI.findByIdAndUpdate(req.params.id, req.body, {new: true}, function (err, data) {
    if (err) return next(err);
    // console.log("Przesłane BODY");
    // console.log(req.body);
    // console.log("Zwrócone dane, DATA");
    // console.log(data);
    res.json(data);
  });
});

/* DELETE /users/:id */
app.delete('/users/:id', function(req, res, next) {
  UsersAPI.findByIdAndRemove(req.params.id, req.body, function (err, data) {
    if (err) return next(err);
    res.json(data);
  });
});


////////////////////////////////////////////////////////////////////////////////
// cars collection
////////////////////////////////////////////////////////////////////////////////

/* GET /cars listing. */
app.get('/cars', checkAuth, function(req, res, next) {
  CarsAPI.find(function (err, data) {
    if (err) return next(err);
    res.json(data);
  });
});

/* POST /cars */
app.post('/cars', checkAuth, function(req, res, next) {
  // console.log(req);
  CarsAPI.create(req.body, function (err, data) {
    if (err) return next(err);
    // console.log(JSON.stringify(data));
    res.json(data);
  });
});

/* GET /cars/:id */
app.get('/cars/:id', checkAuth, function(req, res, next) {
  CarsAPI.findById(req.params.id, function (err, data) {
    if (err) return next(err);
    res.json(data);
  });
});

/* PUT /cars/:id */
app.put('/cars/:id', checkAuth, function(req, res, next) {
  CarsAPI.findByIdAndUpdate(req.params.id, req.body, {new: true}, function (err, data) {
    if (err) return next(err);
    res.json(data);
  });
});

/* DELETE /cars/:id */
app.delete('/cars/:id', checkAuth, function(req, res, next) {
  CarsAPI.findByIdAndRemove(req.params.id, req.body, function (err, data) {
    if (err) return next(err);
    res.json(data);
  });
});

////////////////////////////////////////////////////////////////////////////////
// OpenAI reoutes
////////////////////////////////////////////////////////////////////////////////

/* POST /openai */
app.post('/openai', async function(req, res, next) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
        { role: "system", content: "You are a helpful assistant." },
          req.body
        // {
        //     role: "user",
        //     // content: "Write a haiku about recursion in programming.",
        //     // content: "Tell mi something about the highest mmountin in Solar System.",
        //     content: "Powiedz mi coś o najwyższym szczycie na Ziemi",
        // },
    ],
    store: true,
  });
  // console.log(completion.choices[0].message);
  // res.json(completion.choices[0].message);
  res.json(completion.choices);
  // res.json(completion);
});



app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
