$(function(){
	
	var user_music = {};
	var voted = {};
	
	var current = null;
	
	Object.size = function(obj) {
	    var size = 0, key;
	    for (key in obj) {
	        if (obj.hasOwnProperty(key)) size++;
	    }
	    return size;
	};
	
	
	// -------------------------------------------------------------------  Add the user name to the catalog || POST /catalog
	if(!window.sessionStorage.name){
		// If nothing in the sessionStorage, show the form to enter a name
		$("#send_name").click(function(){
			window.sessionStorage.name = $('#name').val();
			$.post('/Music.html/catalog', $('#name').val());
			$('#name_wrapper').remove();
			get_user_music();
		});
	} else {
		// Else, submit the name from the sessionStorage
		console.log("Already a name : " + window.sessionStorage.name);
		$.post('/Music.html/catalog', window.sessionStorage.name);
		$('#name_wrapper').remove();
		get_user_music();
	}
	
	// ------------------------------------------------------------------- Get the current playlist || GET /playlist
	function get_playlist(){
		//console.log("get playlist");
		$('#playlist').empty();
		$.get('/Music.html/playlist', function(data){
			//console.log("playlist : " + data);
			var playlist = JSON.parse(data);
			console.log(playlist);
			for(song in playlist){
				if(!$.isEmptyObject(playlist[song])){
					var song_node = $("<div class='playlist_song' data-id='"+ song +"'><h3>"+playlist[song]["title"] +
									  "</h3><div>"+playlist[song].artist + " dans l'album : " + 
									  playlist[song]["album"] + 
									  "<span class='votes'> Votes : " + 
									  playlist[song].votes + 
									  "</span></div>" + (voted[song] ? "" : "<button class = 'upvote'> Vote </button>") +  "</div>");
				}
				$('#playlist').append(song_node);
			}
			$('.upvote').click(function(data){
				var global_id = $(this).parent().attr('data-id');
		// ------------------------------------------------------------------- Upvote a song || PUT /playlist
				$.ajax({
					method : 'PUT',
					url : 'Music.html/playlist',
					data : global_id,
					success : voted[global_id] = true
				});
				this.remove();
			});
		});	
	}
	
	setInterval(get_playlist, 10000);
	
	// ------------------------------------------------------------------- Get the songs of the user || GET /user
	function get_user_music(){
		$('#user_songs').empty();
		$.get('Music.html/user', window.sessionStorage.name).done(function(data){
			user_music = JSON.parse(data);
			for(song in user_music){
				console.log(JSON.stringify(user_music[song]));
				var song_node = $("<div class='user_song' data-id='"+
									 user_music[song].global_id +
									 "'><h3 class='song_title'>" +
									 user_music[song]["title"]+
									 "</h3><div>" +
									 user_music[song]["artist"]+
									  " dans l'album : " +
									   user_music[song]["album"] +
									   "</div><button class='delete'> Remove </button> <button class='submit'> Submit </button></div>"
									);
				$('#user_songs').append(song_node);
			}
			// Code to delete the song
				$('.delete').click(function(){
					var global_id = $(this).parent().attr('data-id');
					$.ajax({
				// ------------------------------------------------------------------- Delete a song of the user || DELETE /user
						method : 'DELETE',
						url : '/Music.html/user',
						data : JSON.stringify({user : window.sessionStorage.name, global_id : global_id})
					})
					.done(
						get_user_music()
					);
				});
				
				$('.submit').click(function(){
					var global_id = $(this).parent().attr('data-id');
					$.ajax({
				// ------------------------------------------------------------------- Add a song to the playlist || POST /playlist
						method : 'POST',
						url : '/Music.html/playlist',
						data : JSON.stringify({user : window.sessionStorage.name, global_id : global_id}),
						success : voted[global_id] = true
					})
					.done(
						get_playlist()
					);
				});
		});
	}
		
		
	function get_current_song(){
		// ------------------------------------------------------------------- Get the currently playing song || GET /current
		$.get('Music.html/current', function(data){
			var music = JSON.parse(data);
			if(music.votes === 0){
				current = null;
			} else {
				current = music;
				delete voted[music.global_id];
			}
			launch_music(music);
		});
	}
	
	function launch_music(music){
		if(music !== null){
			//var song_time = Math.floor(music.time/60) + ((music.time%60)/100);
			console.log("timer : " + music.time);
			get_playlist();
			DZ.player.playTracks([music.id], 0, music.time);
			setTimeout(function(){get_current_song();}, (music.duration-music.time)*1000);
		}
	};
		
	// Ask for a song to play if there is not
	//get_current_song();
	setInterval(function(){
		if(current === null){
			get_current_song();
		}
	}, 10000);
	
	function get_song_place(){
		var i = 0;
		while(user_music[i]){
			i++;
		}
		return i;
	};
	
	var query_results = null;
	
	$("#search").keyup(function(){
		DZ.api('/search?q='+$(this).val()+'&index=0&limit=4&output=json', function(response){
			$('#search_results').empty();
			query_results = response.data;
			for( var r in query_results){
				var node = $("<div class='song'><span class='id' style='display : none'>" + r + "</span><h3 class='title'>"+ query_results[r].title +"</h3><div class='name'> par <strong>"+ query_results[r].artist.name + "</strong> dans l'album <strong>" + query_results[r].album.title +"</strong></div></div>");
				$('#search_results').append(node);
				console.log("result" + JSON.stringify(query_results[r]));
			}
			$('.song').click(function(){
				//console.log("user_music " + JSON.stringify(user_music));
				//console.log("user_music size : " + Object.size(user_music));
				
				// The fact that an user can't have more than 20 songs is handled on the client-side. The post request is not even submitted if 20 songs are here.
				if(Object.size(user_music) < 20){
					var s = query_results[$(this).children(('.id')).html()];
					var list_id = get_song_place();
					var song_datas = {
							id : s.id,
							global_id : window.sessionStorage.name + new Date().getHours() + new Date().getMinutes() + new Date().getSeconds() + new Date().getMilliseconds(),
							list_id : list_id,
							user : window.sessionStorage.name,
							title : s.title,
							artist : s.artist.name,
							album : s.album.title,	
							duration : s.duration
					};
					
					song_datas = JSON.stringify(song_datas);
					//console.log(song_datas);
					// ------------------------------------------------------------------- Add a song into the catalog || POST /user
					$.post('/Music.html/user', song_datas, function(){
						get_playlist();
						get_user_music();
					});
				} else {
					alert("You already have 20 songs in.");
				}
					
			});
		});
	});
});

$(window).on('beforeunload', function(){
	// ------------------------------------------------------------------- Delete an user and all his songs from the catalog || DELETE /catalog
	$.ajax({
		method : "DELETE",
		url : "Music.html/catalog",
		data : window.sessionStorage.name
	});
	delete window.sessionStorage.name;
});
