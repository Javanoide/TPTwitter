var express = require('express');
var redis = require('redis');
var client = redis.createClient();
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false });

var app = express();

app.get('/', function(req,res){
	res.render('login.ejs');
});

app.post('/home', urlencodedParser, function(req,res){
	console.log(req.body.user);
	res.render('home.ejs');
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//SERVICEs REST-----------------------------------------------------------------------------------------------//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//Login d'un utilisateur
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
						res.json({success: true, user: req.body.login, msg: 'success login'});
					}else{
						res.json({success: false, user: req.body.login, msg: 'Echec de la connexion'});
					}
				});
			}else{
				res.json({success: false, user: req.body.login, msg: 'Echec de la connexion'});
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

//récupére les followers d'un l'utilisateur
app.post('/tptwitter/follower', urlencodedParser, function(req, res){

});

//récupére ceux qu'un utilisateur suit
app.post('/tptwitter/following', urlencodedParser, function(req, res){

});

//récupére les poste d'un utilisateur
app.post('/tptwitter/post', urlencodedParser, function(req, res){

});
//vérifie le cookie d'un utilisateur par rapport à celui stocké sur son navigateur.
app.post('/tptwitter/checkcookie', urlencodedParser, function(req, res){

});

app.use(function(req, res, next){
	res.setHeader('Content-Type', 'text/plain');
	res.status(404).send('Page not found');
})

app.listen(8080);