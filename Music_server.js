var sys = require("sys"),
my_http = require("http"),
path = require("path"),
url = require("url"),
filesys = require("fs");
//mongoose = require('mongoose');

var playlist = {};

function add_user(name){
	playlist[name]={};
};

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};


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
				response.end;
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
		//----------------------------------------------------------------------------------------- DELETE /playlist ( to delete an user from the list of songs )		
		if (full_path.substr(full_path.length - 9) === '/playlist' && request.method == 'DELETE'){
			request.on('end', function(){
				console.log("delete " + req_data);
				delete playlist[req_data];
			});
		//----------------------------------------------------------------------------------------- GET /playlist ( to get the list of songs )
		} else if(full_path.substr(full_path.length - 9) === '/playlist' && request.method == 'GET'){
			response.write(JSON.stringify(playlist));
			response.end();
		//----------------------------------------------------------------------------------------- POST /playlist ( to post a new user to the playlist )
		} else if(full_path.substr(full_path.length - 9) === '/playlist' && request.method == 'POST') {
			// Add the user to the playlist. If the user is already in it, just display an error msg
			request.on('end',function(){
				if(!playlist[req_data]){
					console.log("data : " + req_data);
					add_user(req_data);
					console.log(playlist);
				} else {
					console.log("User already there : " + req_data);
				}
				response.writeHeader(200);
				response.end();
			});
		//----------------------------------------------------------------------------------------- DELETE /user (to delete a song from an user)
		} else if(full_path.substr(full_path.length - 5) === '/user' && request.method == 'DELETE'){
			request.on('end',function(){
				console.log("delete : " + req_data);
				var obj = JSON.parse(req_data);
				delete playlist[obj["user"]][obj["id"]];
				console.log(JSON.stringify(playlist));
			});
			response.writeHeader(200);
			response.end();
		//----------------------------------------------------------------------------------------- GET /user ( to get the songs of an user )	
		} else if(full_path.substr(full_path.length - 5) === '/user' && request.method == 'GET'){
			//console.log("query : " + query);
			response.writeHeader(200);
			if(Object.size(playlist) === 0 || !playlist[query]){
				response.write("Pas d'objet");
				console.log("playlsit is empty");
			} else {
				response.write(JSON.stringify(playlist[query]));
			}
			response.end();
		//----------------------------------------------------------------------------------------- POST /user ( to add a new song to an user )	
		} else if (full_path.substr(full_path.length - 5) === '/user' && request.method == 'POST'){
			request.on('end', function(){
				//console.log("datas : " + req_data);
				var obj = JSON.parse(req_data);
				//console.log(playlist[obj["username"]]);
				var number = Object.size(playlist[obj["username"]]);
				playlist[obj["username"]][number] =  obj["song"];
				console.log(JSON.stringify(playlist));
				response.writeHeader(200, {"Content-type": "text/plain"});
				response.end();

			});
		} else if(full_path.substr(full_path.length - 8) === '/current' && request.method == 'GET'){
			//console.log("get the current song");
		}

	}
	
}).listen(8080);
