var express = require('express');
var redis = require('redis');
var client = redis.createClient();
var bodyParser = require('body-parser');
var session = require('cookie-session'); 
var urlencodedParser = bodyParser.urlencoded({ extended: false });
var uuid = require('node-uuid');

var app = express();

app.get('/', function(req,res){
	res.render('login.ejs');
});

app.get('/test', function(req,res){
	console.log(uuid.v4());
});

app.post('/home', urlencodedParser, function(req,res){
	console.log(req.body.userid);
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
						//création d'un cookie pour l'utilisateur qui vient de se logger
						cookieid = uuid.v4();
						client.hset('user:'+ id, 'auth', cookieid);
						console.log('user:'+ id, 'auth', cookieid);
						res.cookie("auth", cookieid, { expires: new Date(Date.now() + 1000 * 60 * 10), httpOnly: true });
						//on renvoie que loggin à reussi
						res.json({success: true, userid: id, msg: 'success login'});
					}else{
						res.json({success: false, userid: id, msg: 'Echec de la connexion'});
					}
				});
			}else{
				res.json({success: false, userid: id, msg: 'Echec de la connexion'});
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

//ajoute un followers à un utilisateur
app.post('/tptwitter/follower', urlencodedParser, 
	function(req, res){
		if(req.body.userid != '' && req.body.followid != ''
			&& typeof req.body.userid != 'undefined' 
			&& typeof req.body.followid != 'undefined'){
			client.zadd( 'followers:' + req.body.userid, Date.now(), req.body.followid, 
				function (err, response) {
					if(err){
						throw err;
						console.log(err);
					}
				});
		}//ajouter msg erreur
});
//récupére les followers d'un l'utilisateur (trie du plus ancien au plus recent)
app.get('/tptwitter/follower/:userid', function(req, res){
	if(req.params.userid != '' && typeof req.params.userid != 'undefined') {
		client.zrange('followers:' + req.params.userid, 0, -1, //'withscores', 
			function (err, response) {
				if(err){
					throw err;
					console.log(err);
				}else{
					res.json(response);
				}
		});
	}//ajouter msg erreur

});

//ajoute un utilisateur à suivre
app.post('/tptwitter/following/', urlencodedParser, 
	function(req, res){
		if(req.body.userid != '' && req.body.followid != ''
			&& typeof req.body.userid != 'undefined' 
			&& typeof req.body.followid != 'undefined'){
			client.zadd( 'following:' + req.body.userid, Date.now(), req.body.followid, 
				function (err, response) {
					if(err){
						throw err;
						console.log(err);
					}
				});
		}//ajouter msg erreur

});
//récupére ceux qu'un utilisateur suit (trie du plus ancien au plus recent)
app.get('/tptwitter/following/:userid', 
	function(req, res){
		if(req.params.userid != '' && typeof req.params.userid != 'undefined') {
			client.zrange('following:' + req.params.userid, 0, -1, //'withscores', 
				function (err, response) {
					if(err){
						throw err;
						console.log(err);
					}else{
						res.json(response);
					}
			});
		}//ajouter msg erreur

});

//ajoute le post d'un utilisateur
app.post('/tptwitter/post', urlencodedParser, 
	function(req, res){
		if(req.body.id != '' && req.body.msg != ''
			&& typeof req.body.id != 'undefined' 
			&& typeof req.body.msg != 'undefined'){
			client.zadd( 'post:' + req.body.id, Date.now(), req.body.msg, 
				function (err, response) {
					if(err){
						throw err;
						console.log(err);
					}
				});
		}

});
//récupére les poste d'un utilisateur (trie du plus recent au plus ancien)
app.get('/tptwitter/post/:id', 
	function(req, res){
		if(req.params.id != '' && typeof req.params.id != 'undefined') {
			client.zrevrange('post:' + req.params.id, 0, -1, //'withscores', 
				function (err, response) {
					if(err){
						throw err;
						console.log(err);
					}else{
						res.json(response);
					}
			});
		}

});

app.use(function(req, res, next){
	res.setHeader('Content-Type', 'text/plain');
	res.status(404).send('Page not found');
})

app.listen(8080);