$(function(){

	apparenceMusic = function(){
		$("tr").mouseover(function(e){
			if( !$(this).parent().is("thead") ){
				$(this).addClass("orange");
			}
		});
		$("tr").mouseout(function(){
			$(this).removeClass("orange");
		});
	}

	progress = function(music){
		$("#progress-bar").css("width", music.time/music.duration*100 + "%");
		setInterval(function(){
			var width = $("#progress-bar").width();
			var parentWidth = $("#progress-bar").offsetParent().width();
			var percent = 100*width/parentWidth;
			var newPercent = percent + 0.5/total*100;
			$("#progress-bar").css("width", newPercent + "%");
		}, 500);
	}
//--- a revoir pour le son!
    plus = function(){
        $("#volPlus").css(50);

    }

    moins = function(){
        $("#volMoins").css(50);

    }

	apparenceMusic();
	
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
            var list = "<table class='table table-striped table-bordered'><thead><tr><th>#</th><th>Titre</th><th>Auteur</th><th>Album</th><th>J/'aime</th><th>J/'aime?</th></tr></thead><tbody>";
            for(song in playlist) {
                if(!$.isEmptyObject(playlist[song])){
                    var song_node = "<tr><td>"+ playlist[song]["title"] + "</td><td>" + playlist[song]["artist"] + "</td><td>" + playlist[song]["album"] + "</td><td>" + "<span class='votes'>"+ playlist[song].votes + "</span></td>" + (voted[song] ? "" : ("<td data-id='"+ song +"'> <button class = 'upvote'> Vote </button>" + "</td>")) + "</tr>";
                    list += song_node;
                    if (song == playlist.length - 1) {
                        list += "</tbody></table>";
                        $('#user_music').html(list);
                    }}
                    console.log("button vote : " + voted[song]);
                    $('#playlist').append(song_node);
                }
             // pour refaire le binding
            apparenceMusic();
			$('.upvote').click(function(data){
				var global_id = $(this).parent().attr('data-id');
				console.log("global_id" + global_id);
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
	
	// ------------------------------------------------------------------- Get the songs of the user || GET /user playlist
	function get_user_music(){
		$('#user_songs').empty();
		$.get('Music.html/user', window.sessionStorage.name).done(function(data){
			user_music = JSON.parse(data);
            var list = "<table class='table table-striped table-bordered'><thead><tr><th>#</th><th>Titre</th><th>Auteur</th><th>Album</th><th>Soumettre/Enlever</th></tr></thead><tbody>";
            for(song in user_music) {
                console.log(JSON.stringify(user_music[song]));
                var song_node = "<tr><td class='song_title'>" + user_music[song]["title"] + "</td><td>" + user_music[song]["artist"] + "</td><td>" + user_music[song]["album"] + "</td><td>" + "<span data-id='"+ song + "'><button class='delete'> Remove </button> <button class='submit'> Submit </button></span>" + "</td></tr>";
                list += song_node;
                if (song == user_music.length - 1) {
                    list += "</tbody></table>";
                    $('#user_music').html(list);

                }
                $('#user_songs').append(song_node);
            }
                // pour refaire le binding
                apparenceMusic();
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
            progress(music);
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
			var list = "<table class='table table-striped table-bordered'><thead><tr><th>#</th><th>Titre</th><th>Auteur</th><th>Album</th></tr></thead><tbody>";
			query_results = response.data;
			for( var r in query_results){
				console.log(query_results[r]);
				var node = "<tr class='song'><td class='id'>"+(1+parseInt(r))+"</td><td>"+query_results[r].title+"</td><td>"+query_results[r].artist.name+"</td><td>"+query_results[r].album.title+"</td></tr>";
				list+= node;

				if (r == query_results.length-1) {
					list += "</tbody></table>";
					$('#search_results').html(list);
				};

					// pour refaire le binding
					apparenceMusic();
			}

			$('.song').click(function(){
				// The fact that an user can't have more than 20 songs is handled on the client-side. The post request is not even submitted if 20 songs are here.
				if(Object.size(user_music) < 20){
					var s = query_results[$(this).children('.id').html()-1];
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