var express = require('express');
var session = require('cookie-session'); // Charge le middleware de sessions
var bodyParser = require('body-parser'); // Charge le middleware de gestion des paramètres
var urlencodedParser = bodyParser.urlencoded({ extended: false });

var app = express();


/* On utilise les sessions */
app.use(session({secret: 'todotopsecret'}))

.use(function(req, res, next){
	if(typeof(req.session.todolist)=='undefined'){
		req.session.todolist = [];
	}
	next();
})
.get('/todo', function(req, res) {
	res.render('todolist.ejs', {todolist: req.session.todolist});
})

.post('/todo/add/', urlencodedParser, function(req, res) {
	if(req.body.newtodo!=''){
		req.session.todolist.push(req.body.newtodo);
	}
	res.redirect('/todo');
})

.get('/todo/del/:id', function(req, res){
	if(req.params.id != ''){
		req.session.todolist.splice(req.params.id, 1);
	}
	res.redirect('/todo');
})

.listen(8080);