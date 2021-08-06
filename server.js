
// Mazin Abubeker
var socket = require('socket.io');
var http = require("http");
var querystring = require('querystring');
var request = require('request');
var express = require('express');
const { forever } = require('request');
var app = express();
var server = app.listen(process.env.PORT || 3000);
app.use(express.static('public'))
app.use(express.json());
app.set('views', 'views')
.set('view engine', 'ejs')
.get('/', (req, res) => res.render('index'))
.get('/app', (req, res) => res.render('app'))

var io = socket(server);
io.sockets.on('connection', newConnection);

// var REDIRECT_URL = "https://syncerapp.herokuapp.com/";
var REDIRECT_URL = "http://localhost:3000/";
// var REDIRECT_URL = "https://4b902f4674af.ngrok.io";
// var REDIRECT_URL = "https://0144f7d8fee1.ngrok.io";

var c_id = '505f8d8f1a8d4bcaacdcbb0db5da54ca'; // Your client id
var c_secret = 'cc2dc6c51ead4946bb9e4c73b9d635af'; // Your secret
var idMap = new Map();

function newConnection(socket){
  socket.on('request-id', ()=>{
    console.log("New client: " + socket.id);
    socket.emit('id-response', socket.id);
  });

  socket.on('login', ()=>{
    var scopes = 'streaming user-library-read user-modify-playback-state user-top-read user-modify-playback-state user-read-playback-state user-read-private user-read-email playlist-modify-public';
    let resp = 'https://accounts.spotify.com/authorize' +
    '?response_type=code' +
    '&client_id=' + c_id +
    (scopes ? '&scope=' + encodeURIComponent(scopes) : '') +
    '&redirect_uri=' + encodeURIComponent(REDIRECT_URL);
    socket.emit('login-response', resp);
  });

  socket.on('token', res=>{
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      headers: {
        'Authorization': 'Basic ' + (Buffer.from(c_id + ':' + c_secret).toString('base64'))
      },
      form: {
        grant_type: "authorization_code",
        code: res.auth_code,
        redirect_uri: REDIRECT_URL
      },
      json: true
    };
    request.post(authOptions, function(error, response, body){
      if (response.statusCode === 200) {
        idMap.set(res.uid, body.access_token);
        console.log(body.access_token);
        socket.emit('token-response');
      }
    });
  });

  socket.on('ask', res=>{
    var options = {
      url: 'https://api.spotify.com/v1/search?q=' + res.user_req.toString() + '&type=track&limit=30',
      headers: {
        'Authorization': 'Bearer ' + idMap.get(res.uid)
      },
      json: true
    };
    request.get(options, function(error, response, body) {
      if(response.statusCode == 200){
        var results = {songs: []};
        for(var i = 0; i < body.tracks.items.length; i++){
          results.songs.push({title: body.tracks.items[i].name, 
                              artist: body.tracks.items[i].artists[0].name, 
                              uri: body.tracks.items[i].uri,
                            img: body.tracks.items[i].album.images[0].url,
                          id: body.tracks.items[i].id});
          if(i == 0){
            restExample(res.uid, body.tracks.items[i].id);
          }
        }
        socket.emit('ask-response', results);
      }
    });
  });

  socket.on('explore', res=>{
    var options = {
      url: 'https://api.spotify.com/v1/me/top/tracks',
      headers: {
        'Authorization': 'Bearer ' + idMap.get(res.uid)
      },
      json: true
    };
    request.get(options, function(error, response, body) {
      if(response.statusCode == 200){
        let seed_tracks = '';
        for(var i = 0; i < 5; i++){
          if(i!=0){
            seed_tracks+=',';
          }
          seed_tracks += body.items[i].id;
        }
        completeRecommend(res.uid, seed_tracks, socket)

      }
    });
  });

  socket.on('play', res=>{
    var options = {
      headers: {
        'Authorization': 'Bearer ' + idMap.get(res.uid)
      },
      json: true,
      url: 'https://api.spotify.com/v1/me/player/play',
      body: {
        uris: [res.uri] 
      }
    };
    request.put(options, function(error, response, body) {
      if(response.statusCode == 204){
      }
    });
  })

  socket.on('switch', res=>{
    var options = {
      headers: {
        'Authorization': 'Bearer ' + idMap.get(res.uid)
      },
      json: true,
      url: 'https://api.spotify.com/v1/me/player/devices'
    };
    request.get(options, function(error, response, body) {
      if(response.statusCode == 200){
        console.log(body);
        let switch_id = '';
        for(var i = 0; i < body.devices.length; i++){
          if(body.devices[i].name == 'MazPlayer'){
            switch_id = body.devices[i].id;
            break;
          }
        }
        console.log('switch id: ' + switch_id);
        if(switch_id !== ''){
          switchToId(switch_id, res.uid);
        }
      }
    });
  })

  socket.on('rest-example', res=>{
    var options = {
      url: 'https://api.spotify.com/v1/me/top/tracks',
      headers: {
        'Authorization': 'Bearer ' + idMap.get(res.uid)
      },
      json: true
    };
    request.get(options, function(error, response, body) {
      if(response.statusCode == 200){
        let seed_tracks = '';
        for(var i = 0; i < 5; i++){
          if(i!=0){
            seed_tracks+=',';
          }
          seed_tracks += body.items[i].id;
        }
        completeRecommend(res.uid, seed_tracks, socket)

      }
    });
  });
}

function switchToId(switch_id, id){
  var options = {
    url: 'https://api.spotify.com/v1/me/player',
    headers: {
      'Authorization': 'Bearer ' + idMap.get(id)
    },
    body: {
      device_ids: [switch_id]
    },
    json: true
  };
  request.put(options, function(error, response, body) {
    if(response.statusCode == 204){
      console.log("Nice switch dude");
    }
  });
}

function completeRecommend(id, seed, socket){
  console.log(seed);
  var options = {
    url: 'https://api.spotify.com/v1/recommendations?seed_tracks=' + seed,
    headers: {
      'Authorization': 'Bearer ' + idMap.get(id)
    },
    json: true
  };
  request.get(options, function(error, response, body) {
    if(response.statusCode == 200){
      var results = {songs: []};
      var all_uris = [];
      for(var i = 0; i < body.tracks.length; i++){
        results.songs.push({title: body.tracks[i].name, 
                            artist: body.tracks[i].artists[0].name, 
                            uri: body.tracks[i].uri,
                          img: body.tracks[i].album.images[0].url});
        all_uris.push(body.tracks[i].uri);
      }
      socket.emit('explore-response', results);



      var sub_options = {
        url: "https://api.spotify.com/v1/me",
        headers: {
          'Authorization': 'Bearer ' + idMap.get(id)
        },
        json: true
      }
      request.get(sub_options, function(sub_error, sub_response, sub_body) {
        if(sub_response.statusCode == 200){
          console.log(sub_body)
          console.log("Successfully retrieved user id!");
          

          var sub_sub_options = {
            url: "https://api.spotify.com/v1/users/" + sub_body.id + "/playlists",
            headers: {
              'Authorization': 'Bearer ' + idMap.get(id)
            },
            json: true,
            body: {
              "name": "Mazlist " + Date.now(),
              "description": "AI made me!",
              "public": true
            }
          }

          request.post(sub_sub_options, function(sub_sub_error, sub_sub_response, sub_sub_body) {
            if(sub_sub_response.statusCode == 201){
              console.log("New playlist successfully created!");


                var sub_sub_sub_options = {
                  url: "https://api.spotify.com/v1/playlists/" + sub_sub_body.id + "/tracks",
                  headers: {
                    'Authorization': 'Bearer ' + idMap.get(id)
                  },
                  json: true,
                  body: {
                    "uris": all_uris
                  }
                }

                request.post(sub_sub_sub_options, function(sub_sub_sub_error, sub_sub_sub_response, sub_sub_sub_body) {
                  if(sub_sub_sub_response.statusCode == 201){
                    console.log("Songs successfully added to new playlist!");
                    socket.emit("playlist-created");
                  }else{
                    console.log(sub_subsub__error)
                  }
                    
                });

            }
          });


        }else{
          console.log("Error with ME endpoint");
        }
      });

      
      

    }
  });

}

function restExample(uid, track_id){
  var options = {
    url: 'https://api.spotify.com/v1/audio-features/' + track_id,
    headers: {
      'Authorization': 'Bearer ' + idMap.get(uid)
    },
    json: true
  };
  request.get(options, function(error, response, body) {
    if(response.statusCode == 200){
      console.log(body);
    }
  });
}