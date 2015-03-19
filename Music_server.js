var sys = require("sys"),
my_http = require("http"),
path = require("path"),
url = require("url"),
filesys = require("fs");
//mongoose = require('mongoose');

var playlist =[];
var catalog = {};
var current = {votes : 0};
var timer = 0;

function add_user(name){
	catalog[name]={};
};

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

function set_song_timer(){
	var intervalID = setInterval(function(){
		if(timer < current.duration-1){
			console.log("timer : " + timer);
			timer++;
		} else {
			timer = 0;
			most_wanted_song();
			clearInterval(intervalID);
		}
	}, 1000);
}

function sort_songs(callback){
	
}

function most_wanted_song(){
	playlist.sort(sort_by_votes);
	setTimeout(function(){
		current = {votes : 0};
		if(Object.size(playlist[0]) > 0){
			current = playlist[0];
			set_song_timer();
			console.log("before " + JSON.stringify(playlist));
			playlist.shift(); // remove first object of array
			console.log("after " + JSON.stringify(playlist));
		}
	}, 500);
}

function sort_by_votes(a, b){
	var aVotes = a.votes;
	var bVotes = b.votes;
	return(aVotes-bVotes);
}

// Make the server ask for the next song every 10 sec, if there is none. Ans sort the playlist.
setInterval(function(){
	if(current.votes === 0){
		most_wanted_song();
	}
}, 10000);

/*// ------------------------------------------------------------------- Connection to database

mongoose.connect('mongodb://localhost/test');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function(callback){
	
	// ----------------------------------- Make the Song Model
	var songSchema = mongoose.Schema({
		artist: String,
		title: String,
		album: String,
		picture: String,
		link: String
	});
	var Song = mongoose.model('Song', songSchema);
	
	
	// ----------------------------------- Populate the database
	Song.find(function(err, results){
		if(err){return console.log("error: " + err);}
		// If nothing is found, populate it !
		if(!results.length){
			console.log("Nothing found in, populate the DB");
			// First, iterate to get 20 songs
			for(var i = 0 ; i < 480; i+=24){
				var options = {
					host: 'api.deezer.com',
					method: 'GET',
					path: '/track/'+(3135556+i)+'&output=json'
				};
				
				// Get the response
				my_http.get(options, function(res){
					var body = '';
					
					// As the response comes in chunks, we add them to a string
					res.on('data', function(data){
						body += data;
					});
					
					// And, at the end of the reception, we parse the data to JSON
					res.on('end', function(){
						var response = JSON.parse(body);
						// Then we crate the new song
						var chanson = new Song({
							artist: response.artist.name,
							title: response.title,
							album: response.album.title,
							picture: response.album.cover,
							link: response.link
						});
						
						//And save it into the database
						chanson.save(function(err){
							if(err) return console.error(err);
						});
					});
				}).on('error', function(e){
					console.error(e);
				});
			}
		}
	});
	
	// Song.find(function(err, song){
		// if(err) return console.error(err);
		// console.log(song);
	// });
});*/

// ------------------------------------------------------------------- Creating responses
my_http.createServer(function(request, response){
	var my_path = url.parse(request.url).pathname;
	var full_path = path.join(process.cwd(), my_path);
	
	var req_data = "";
	request.on('data', function(chunk){
		req_data += chunk;
	});
	
	var query = url.parse(request.url).query; // To get the query part of the URL, for GET requests data.
	
	/*request.on('end', function(){
		console.log("got data" + req_data);
	});*/
	
	// Si le path se termine par une nom de fichier, on le sert ou alors on envoie une erreur 404
	if(full_path.substr(full_path.length - 3)===".js" || full_path.substr(full_path.length - 5)===".html" || full_path.substr(full_path.length - 4)===".css"){
		
		console.log("path : " + full_path);
		path.exists(full_path, function(exists){							
			if(!exists){
				response.writeHeader(404,{"Content-Type": "text/plain"});
				response.write("404 Not Found\n");
				response.end();
			} else {
				filesys.readFile(full_path, "binary", function(err, file){
					if(err){
						response.writeHeader(500, {"Content-type": "text/plain"});
						response.write(err + "\n");
						response.end();
					} else {
						response.writeHeader(200);
						response.write(file, "binary");
						response.end();
					}
				});
			}
		});
		
	} else {
		
		// Here are handled the CRUD requests
		//----------------------------------------------------------------------------------------- DELETE /catalog ( to delete an user from the list of songs )		
		if (full_path.substr(full_path.length - 8) === '/catalog' && request.method == 'DELETE'){
			request.on('end', function(){
				console.log("delete " + req_data);
				delete catalog[req_data];
			});
		//----------------------------------------------------------------------------------------- POST /catalog ( to post a new user to the catalog )
		} else if(full_path.substr(full_path.length - 8) === '/catalog' && request.method == 'POST') {
			// Add the user to the catalog. If the user is already in it, just display an error msg
			request.on('end',function(){
				if(!catalog[req_data]){
					console.log("data : " + req_data);
					add_user(req_data);
					console.log(catalog);
				} else {
					console.log("User already there : " + req_data);
				}
				response.writeHeader(200);
				response.end();
			});
		//----------------------------------------------------------------------------------------- POST /playlist ( to add a song from the user's catalog to the playlist)
		} else if(full_path.substr(full_path.length - 9) === '/playlist' && request.method == 'POST'){
			request.on('end', function(){
				var obj = JSON.parse(req_data);
				playlist.push(catalog[obj.user][obj.id]);
			});
			response.writeHeader(200);
			response.end();
		//----------------------------------------------------------------------------------------- GET /playlist ( to get the list of songs )
		} else if(full_path.substr(full_path.length - 9) === '/playlist' && request.method == 'GET'){
			response.writeHeader(200);
			response.write(JSON.stringify(playlist));
			response.end();
		//----------------------------------------------------------------------------------------- PUT /playlist (to update votes on a song)
		} else if(full_path.substr(full_path.length - 9) === '/playlist' && request.method == 'PUT'){
			request.on('end', function(){
				var v = playlist[req_data].votes++;
				console.log("votes : " + v);
				response.writeHeader(200);
				//response.write(JSON.stringify({votes : v}));
				response.end();
			});
		//----------------------------------------------------------------------------------------- DELETE /user (to delete a song from an user)
		} else if(full_path.substr(full_path.length - 5) === '/user' && request.method == 'DELETE'){
			request.on('end',function(){
				console.log("delete : " + req_data);
				var obj = JSON.parse(req_data);
				delete catalog[obj["user"]][obj["id"]];
				console.log(JSON.stringify(catalog));
			});
			response.writeHeader(200);
			response.end();
		//----------------------------------------------------------------------------------------- GET /user ( to get the songs of an user )	
		} else if(full_path.substr(full_path.length - 5) === '/user' && request.method == 'GET'){
			//console.log("query : " + query);
			response.writeHeader(200);
			if(Object.size(catalog) === 0 || !catalog[query]){
				response.write("Pas d'objet");
				console.log("playlsit is empty");
			} else {
				response.write(JSON.stringify(catalog[query]));
			}
			response.end();
		//----------------------------------------------------------------------------------------- POST /user ( to add a new song to an user )
		} else if (full_path.substr(full_path.length - 5) === '/user' && request.method == 'POST'){
			request.on('end', function(){
				//console.log("datas : " + req_data);
				var obj = JSON.parse(req_data);
				//console.log(catalog[obj["username"]]);

				catalog[obj.user][obj.list_id] =  obj;
				console.log(JSON.stringify(catalog));
			});
			response.writeHeader(200, {"Content-type": "text/plain"});
			response.end();
		//----------------------------------------------------------------------------------------- GET /current (to get the song currently playing)
		} else if(full_path.substr(full_path.length - 8) === '/current' && request.method == 'GET'){
			//console.log("get the current song");
			if(current.votes === 0){
				response.writeHeader(404);
			} else {
				response.writeHeader(200);
				current['time'] = timer;
				response.write(JSON.stringify(current));
			}
			response.end();
		}

	}
	
}).listen(8080);
