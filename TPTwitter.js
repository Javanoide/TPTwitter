var express = require('express');
var redis = require('redis');
var client = redis.createClient();
var bodyParser = require('body-parser');
var cookie = require('cookie-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false });
var uuid = require('node-uuid');
var async = require('async');

var app = express();

//use cookie
app.use(cookie());
//enabling cors
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

///////////////////////////////////////////////
//Routes
///////////////////////////////////////////////
app.get('/', function(req,res){
	res.render('login.ejs');
});
//route de test
app.get('/test', function(req,res){

});

app.post('/home', urlencodedParser, function(req,res){
	console.log(req.body.userid + ' ' + req.body.username);
	res.render('home.ejs', {userid: req.body.userid, username: req.body.username});
});
//test en get
app.get('/home', function(req,res){
	res.render('home.ejs');
});

app.get('/about', function(req,res){
	res.render('about.ejs');
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//SERVICEs REST-----------------------------------------------------------------------------------------------//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//Login d'un utilisateur
app.post('/tptwitter/login', urlencodedParser, function(req, res){
	if(req.body.login !='' && req.body.passwd != ''){
		//on récupére l'id du l'user à partir de son login
		client.hget('users', req.body.login, function(err, reply) {
			var id = reply;
			if(reply){
				client.hget('user:'+id, 'password', function(err, reply){
					var password = reply;
					if(reply && password == req.body.passwd){
						//création d'un cookie pour l'utilisateur qui vient de se logger
						cookieid = uuid.v4();
						client.hset('user:'+ id, 'auth', cookieid);
						res.cookie("auth", cookieid, { expires: new Date(Date.now() + 1000 * 60 * 10), httpOnly: true });
						//on renvoie que loggin à reussi
						res.json({success: true, userid: id, username: req.body.login, msg: 'success login'});
					}else{
						res.json({success: false, msg: 'Echec de la connexion'});
					}
				});
			}else{
				res.json({success: false, msg: 'Echec de la connexion'});
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

//retourne l'userid correspondant au login
app.get('/tptwitter/login/:login', function(req, res){
	client.hget('users', req.params.login, function (err, response) {
		res.json({userid : response, login : req.params.login});
	});
});

//ajoute un followers à un utilisateur
app.post('/tptwitter/followers', urlencodedParser, function(req, res){
	if(req.body.userid != '' && req.body.followid != ''
		&& typeof req.body.userid != 'undefined'
		&& typeof req.body.followid != 'undefined'){
		client.zadd( 'followers:' + req.body.userid, Date.now(), req.body.followid, function (err, response) {
			if(err){
				throw err;
				console.log(err);
			}
		});
	}//ajouter msg erreur
});
//récupére les followers d'un l'utilisateur (trie du plus ancien au plus recent)
app.get('/tptwitter/followers/:userid', function(req, res){
	if(req.params.userid != '' && typeof req.params.userid != 'undefined') {
		//on recherche les id des followers
		client.zrange('followers:' + req.params.userid, 0, -1, function (err, response) {
			if(err){
				throw err;
				console.log(err);
			}else{
				//on stocke le resultat dans un tableau
				var idList = response;
				//tableau qui va contenir le nom des followers
				var followersNames = [];
				//Comme les requêtes sont asynchrones, j'utilise async.each pour attendre la fin de toutes le requête hget avant d'envoyer le tableau dûement rempli
				async.each(idList,
					function(id, callback){
						client.hget('user:'+ id, 'username', function(err, reply){
							if(err){
								throw err;
								console.log(err);
							}else{
								followersNames.push(reply);
								callback();
							}
						});

					},
					//quand les requetes sont fini, je recherche le nom de l'utilisateur et je construit ma reponse json
					function(err){
						if(err){
							console.log(err);
							throw err;
						}else{
							//on récupére le nom de lutilisateur
							client.hget('user:'+ req.params.userid, 'username', function(err, reply){
								if(err){
									throw err;
									console.log(err);
								}else{
									//reponse json
									res.json({userid : reply, followers : followersNames});
								}
							});
						}
					}
				);
			}
		});
	}//ajouter msg erreur

});

//ajoute un utilisateur à suivre
app.post('/tptwitter/followings/', urlencodedParser, function(req, res){
	if(req.body.userid != '' && req.body.followid != ''
		&& typeof req.body.userid != 'undefined'
		&& typeof req.body.followid != 'undefined'){
		client.zadd( 'following:' + req.body.userid, Date.now(), req.body.followid, function (err, response) {
			if(err){
				throw err;
				console.log(err);
			}
		});
	}//ajouter msg erreur
});
//récupére ceux qu'un utilisateur suit (trie du plus ancien au plus recent)
app.get('/tptwitter/followings/:userid', function(req, res){
	if(req.params.userid != '' && typeof req.params.userid != 'undefined') {
		client.zrange('following:' + req.params.userid, 0, -1, //'withscores',
			function (err, response) {
				if(err){
					throw err;
					console.log(err);
				}else{
				//on stocke le resultat dans un tableau
				var idList = response;
				//tableau qui va contenir le nom des followers
				var followingsNames = [];
				//Comme les requêtes sont asynchrones, j'utilise async.each pour attendre la fin de toutes le requête hget avant d'envoyer le tableau dûement rempli
				async.each(idList,
					function(id, callback){
						client.hget('user:'+ id, 'username', function(err, reply){
							if(err){
								throw err;
								console.log(err);
							}else{
								followingsNames.push(reply);
								callback();
							}
						});
					},
					//quand les requetes sont fini, je recherche le nom de l'utilisateur et je construit ma reponse json
					function(err){
						if(err){
							console.log(err);
							throw err;
						}else{
							//on récupére le nom de lutilisateur
							client.hget('user:'+ req.params.userid, 'username', function(err, reply){
								if(err){
									throw err;
									console.log(err);
								}else{
									//reponse json
									res.json({userid : reply, followings : followingsNames});
								}
							});
						}
					}
				);
			}
		});
	}//ajouter msg erreur
});

//ajoute le post d'un utilisateur
app.post('/tptwitter/posts', urlencodedParser, function(req, res){
	if(req.body.userid != '' && req.body.msg != '' && typeof req.body.userid != 'undefined' && typeof req.body.msg != 'undefined'){
		client.hget('user:' + req.body.userid, 'auth', function (err, response) {
			if(response == req.cookies.auth){
				client.zadd( 'posts:' + req.body.userid, Date.now(), req.body.msg, function (err, response) {
					console.log('posts:' + "   " + req.body.userid, Date.now() + "  " + req.body.msg);
					if(err){
						throw err;
						console.log(err);
					}else{
						res.json({succes : true});
					}
				});
			}
		})
	}
});

//récupére les poste d'un utilisateur (trie du plus recent au plus ancien)
app.get('/tptwitter/posts/:userid',
	function(req, res){
		if(req.params.userid != '' && typeof req.params.userid != 'undefined') {
			client.zrevrange('posts:' + req.params.userid, 0, -1, function (err, response) {
					if(err){
						throw err;
						console.log(err);
					}else{
						//on récupére le nom de lutilisateur
						client.hget('user:'+ req.params.userid, 'username', function(err, reply){
							if(err){
								throw err;
								console.log(err);
							}else{
								//reponse json
								res.json({userid : reply, posts : response});
							}
						});
					}
			});
		}
});

app.use(function(req, res, next){
	res.setHeader('Content-Type', 'text/plain');
	res.status(404).send('Page not found');
})

app.listen(8000);
