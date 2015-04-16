var sys = require("sys"),
my_http = require("http"),
path = require("path"),
url = require("url"),
filesys = require("fs");
//mongoose = require('mongoose');

var playlist = {};
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
		if(timer < current.duration-2){
			//console.log("timer : " + timer);
			timer++;
		} else {
			timer = 0;
			most_wanted_song();
			clearInterval(intervalID);
		}
	}, 1000);
}

function most_wanted_song(){
		current = {votes : 0};
		if(Object.size(playlist) > 0){
			for(song in playlist){
				if (playlist[song].votes > current.votes) {
					current = playlist[song];
				}
			}
			//console.log("current : " + JSON.stringify(current));
			set_song_timer();
			delete playlist[current.global_id];
		};
}

// Make the server ask for the next song every 10 sec, if there is none. And sort the playlist.
setInterval(function(){
	if(current.votes === 0){
		console.log("currently empty");
		most_wanted_song();
	}
}, 10000);

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
			console.log("request POST /playlist");
			request.on('end', function(){
				var obj = JSON.parse(req_data);
				playlist[obj.global_id] = catalog[obj.user][obj.global_id];
				// We assume that the user who updated the song voted for it
				playlist[obj.global_id].votes = 1;
			});
			response.writeHeader(200);
			response.end();
		//----------------------------------------------------------------------------------------- GET /playlist ( to get the list of songs )
		} else if(full_path.substr(full_path.length - 9) === '/playlist' && request.method == 'GET'){
			//console.log(JSON.stringify(playlist));
			response.writeHeader(200);
			response.write(JSON.stringify(playlist));
			response.end();
		//----------------------------------------------------------------------------------------- PUT /playlist (to update votes on a song)
		} else if(full_path.substr(full_path.length - 9) === '/playlist' && request.method == 'PUT'){
			request.on('end', function(){
				playlist[req_data].votes++;
				response.writeHeader(200);
				response.end();
			});
		//----------------------------------------------------------------------------------------- DELETE /user (to delete a song from an user)
		} else if(full_path.substr(full_path.length - 5) === '/user' && request.method == 'DELETE'){
			request.on('end',function(){
				console.log(JSON.stringify(catalog));
				console.log("delete : " + req_data);
				var obj = JSON.parse(req_data);
				delete catalog[obj.user][obj.global_id];
				console.log(JSON.stringify(catalog));
			});
			response.writeHeader(200);
			response.end();
		//----------------------------------------------------------------------------------------- GET /user ( to get the songs of an user )	
		} else if(full_path.substr(full_path.length - 5) === '/user' && request.method == 'GET'){
			//console.log("query : " + query);
			if(Object.size(catalog) === 0 || !catalog[query]){
				response.writeHeader(404);
				response.write("Pas d'objet");
				console.log("playlist is empty");
			} else {
				response.writeHeader(200);
				response.write(JSON.stringify(catalog[query]));
			}
			response.end();
		//----------------------------------------------------------------------------------------- POST /user ( to add a new song to an user )
		} else if (full_path.substr(full_path.length - 5) === '/user' && request.method == 'POST'){
			request.on('end', function(){
				//console.log("datas : " + req_data);
				var obj = JSON.parse(req_data);
				//console.log(catalog[obj["username"]]);

				catalog[obj.user][obj.global_id] =  obj;
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
				current.time = timer;
				response.write(JSON.stringify(current));
			}
			response.end();
		}

	}
	
}).listen(8080);