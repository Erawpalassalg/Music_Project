$(function(){
	
	var user_music = {};
	
	var current = null;
	
	Object.size = function(obj) {
	    var size = 0, key;
	    for (key in obj) {
	        if (obj.hasOwnProperty(key)) size++;
	    }
	    return size;
	};
	
	
	// -------------------------------------------------------------------  Add the user name to the playlist || POST /playlist
	if(!window.sessionStorage.name){
		// If nothing in the sessionStorage, show the form to enter a name
		$("#send_name").click(function(){
			window.sessionStorage.name = $('#name').val();
			$.post('/Music.html/playlist', $('#name').val());
			$('#name_wrapper').remove();
			get_user_music();
		});
	} else {
		// Else, submit the name from the sessionStorage
		console.log("Already a name : " + window.sessionStorage.name);
		$.post('/Music.html/playlist', window.sessionStorage.name);
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
			for(user in playlist){
				//console.log("user : " + user);
				for(song in playlist[user]){
					//console.log(song);
					if(!$.isEmptyObject(playlist[user][song])){
						var song_node = $("<div class='playlist_song'><h3>"+playlist[user][song]["title"]+"</h3><div>"+playlist[user][song]["artist"]+ " dans l'album : "+ playlist[user][song]["album"]+"</div></div>");
						
					} else {
						var song_node = $("<div>  No song " + playlist[user][song]+" </div>");
					}
					$('#playlist').append(song_node);
				}
			}
		});	
	}
	
	setInterval(get_playlist, 30000);
	
	// ------------------------------------------------------------------- Get the current songs of the user || GET /user
	function get_user_music(){
		$('#user_songs').empty();
		$.get('Music.html/user', window.sessionStorage.name).done(function(data){
			user_music = JSON.parse(data);
			for(song in user_music){
				var song_node = $("<div class='user_song'><h3 class='song_title'><span class='ID'>" + 
									(parseInt(song)+1) +
									 "</span> : " + 
									 user_music[song]["title"]+
									 "</h3><div>" +
									 user_music[song]["artist"]+
									  " dans l'album : " +
									   user_music[song]["album"] +
									   "</div><div class='deleter'> X </div></div>"
									);
				$('#user_songs').append(song_node);
				// Code to delete the song
				$('.deleter').click(function(){
					var id = $(this).siblings(".song_title").children(".ID").html() - 1;
					$.ajax({
						method : 'DELETE',
						url : '/Music.html/user',
						data : JSON.stringify({user : window.sessionStorage.name, id : id})
					})
					.done(function(){
						get_user_music();
						get_playlist();
					});
				});
			}
		});
	}
		
		
	function get_current_song(){
		$.get('Music.html/current', function(data){
			var music = JSON.parse(data);
			if(music.vote === 0){
				current = null;
			} else {
				current = music;
			}
			launch_music(music);
		});
	}
	
	function launch_music(music){
		if(music !== null){
			//var song_time = Math.floor(music.time/60) + ((music.time%60)/100);
			console.log("timer : " + music.time);
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
				//console.log("result" + JSON.stringify(query_results[r]));
			}
			$('.song').click(function(){
				//console.log("user_music " + JSON.stringify(user_music));
				//console.log("user_music size : " + Object.size(user_music));
				
				// The fact that an user can't have more than 3 songs is handled on the client-side. The post request is not even submitted if 3 songs are here.
				if(Object.size(user_music) < 3){
					var s = query_results[$(this).children(('.id')).html()];
					alert(query_results[$(this).children(('.id')).html()].title);
					var list_id = get_song_place();
					var song_datas = {
							id : s.id,
							list_id : list_id,
							user : window.sessionStorage.name,
							title : s.title,
							artist : s.artist.name,
							album : s.album.title,	
							duration : s.duration,
							vote : 1
					};
					
					song_datas = JSON.stringify(song_datas);
					//console.log(song_datas);
					$.post('/Music.html/user', song_datas, function(){
						get_playlist();
						get_user_music();
					});
				} else {
					alert("You already have 3 songs in.");
				}
					
			});
		});
	});
});

$(window).on('beforeunload', function(){
	$.ajax({
		method : "DELETE",
		url : "Music.html/playlist",
		data : window.sessionStorage.name
	});
	delete window.sessionStorage.name;
});
