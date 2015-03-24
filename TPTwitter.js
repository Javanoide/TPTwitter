var express = require('express');
var redis = require('redis');
var client = redis.createClient();
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false });

var app = express();

app.get('/accueil', function(req,res){
	res.render('accueil.ejs', {msg: req.params.msg});
});

//SERVICEs REST
app.post('/tptwitter/login', urlencodedParser, function(req, res){
	if(req.body.login !='' && req.body.passwd != ''){
		//on récupére l'id du l'user à partir de son login
		console.log(req.body.login + '   ' + req.body.passwd);
		client.hget('users', req.body.login, function(err, reply) {
			var id = reply;
			if(reply){
				client.hget('user:'+id, 'password', function(err, reply){
					var password = reply;
					if(reply && password == req.body.passwd){
						res.json({msg: 'success login'});
					}else{
						res.json({msg: 'Echec de la connexion'});
					}
				});
			}else{
				res.json({msg: 'Echec de la connexion'});
			}
		});
	}
	
});

//enregistrement d'un nouvel utilisateur
app.post('/tptwitter/newuser', urlencodedParser, function(req, res){
	//On verifie que le formulaire n'est pas vide
	if(req.body.newlogin !='' && req.body.newpasswd != '' && req.body.newpasswd2 != ''){

		//on verfifie que la confirmation du password est juste
		if(req.body.newpasswd != req.body.newpasswd2){
			//si elle ne l'est pas en renvoie à l'accueil (prévoir msg erreur)
			res.json({msg: 'Mots de passes différents'});
		}else{
			var id;
			//on incrémente la variable userid
			client.incr('userid');
			//on la récupére
			client.get('userid', function(err, reply){
				if(reply){
					id = reply;
					console.log("id : " + id);
				}else{
					res.json({msg: 'Echec de l\'inscription, veuillez rééssayer plus tard'});
				}
				//ensuite on crée un hmset avec pour intitulé l'id et contenant le login et le mot de passe de l'utilisateur
				client.hmset('user:'+id, 'username', req.body.newlogin, 'password', req.body.newpasswd);
				//on crée un hset pour pouvoir retrouvé l'id de l'utilisateur à partir de son login
				client.hset('users', req.body.newlogin, id);
				//on redirige vers l'accueil (prévoir msg de confirmation)
				res.json({msg: 'Vous êtes incrit, vous pouvez desormais vous connecter :)'});
			});
		}
		
	}
	
});
/*
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
	
});*/

app.use(function(req, res, next){
	res.setHeader('Content-Type', 'text/plain');
	res.status(404).send('Page not found');
})

app.listen(8080);