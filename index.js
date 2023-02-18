const express = require('express')
const app = express()

// app.all('/', (req, res) => {
//     console.log("Just got a request!")
//     res.send('Yo!')
// })

app.get('/', function (req, res) {
  res.render('index', { title: 'REST API' })
})

app.get('/hello', function(req, res, next) {
  res.send("Hello World form Czestochowa :D");
});

app.listen(process.env.PORT || 3000)
