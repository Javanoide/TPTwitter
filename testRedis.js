var express = require('express');
var redis = require('redis');
var client = redis.createClient();
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false });

var app = express();

app.get('/accueil', function(req,res){
	res.render('accueil.ejs', {nom: req.params.nom});
});

app.get('/redis/set/:key/:value', function(req, res){
	client.set(req.params.key, req.params.value);
	res.redirect('/accueil');
})

app.get('/redis/get/:key', function(req, res){
	client.get(req.params.key, function(err, reply){
		if(reply){
			res.render('accueil.ejs', {key: req.params.key, value: reply});
		}else{
			res.render('noValue.ejs');
		}
	});
});

app.post('/redis/set', urlencodedParser, function(req, res){
	if(req.body.key!='' && req.body.value !=''){
		res.redirect('/redis/set/' + req.body.key +'/' + req.body.value);
	}else{
		res.redirect('/accueil');
	}
	
});

app.post('/redis/get', urlencodedParser, function(req, res){
	if(req.body.key!=''){
		res.redirect('/redis/get/' + req.body.key +'/');
	}
	
});

app.use(function(req, res, next){
	res.setHeader('Content-Type', 'text/plain');
	res.status(404).send('Page not found');
})

app.listen(8080);