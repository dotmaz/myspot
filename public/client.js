
// let sound_src;

var socket = io();
var auth_code = '';
var unique_id = '';
$(document).ready(function(){
  // src = new p5.AudioIn();
  // console.log(src.getSources());
  // Server has authenticated login [Token authentication redirect]
  if(window.location.href.includes('code')){
    document.getElementById('btn-login').remove();
    const urlParams = new URLSearchParams(window.location.search);
    auth_code = urlParams.get('code');
    socket.emit('request-id');
    socket.on('id-response', newId=>{
      unique_id = newId;
      retrieve_token();
    });
  }

  socket.on('playlist-created', ()=>{
    alert("Playlist successfully created");
  });
});


// Login button has been pressed [Credential authentication]
function authorize_login(){
  socket.emit('login');
  socket.on('login-response', res=>{
    window.location.href = res;
  });
}

// Called from after login....
function retrieve_token(){
  socket.emit('token', {auth_code: auth_code, uid: unique_id});
  socket.on('token-response', ()=>{
    load('/app', startApp);
  });
}

// User searched for a song
function request(){
  console.log("request initiated");
  // document.getElementById('load-gif').style.display = 'block';
  if(document.getElementById('search-input').value  == ''){
    return;
  }
  socket.emit('ask', {user_req: document.getElementById('search-input').value, uid: unique_id});
  socket.on('ask-response', res=>{
    let result_box = document.getElementById('results');
    result_box.innerHTML = '';
    let data = res;
    populateResults(result_box, data.songs);
  });
}

function getAverageColor(image, song){
  let cnv = document.getElementById('myCanvas');
  let ctx = cnv.getContext('2d');
  ctx.drawImage(image, 0, 0, 100, 100);
  const imageData = ctx.getImageData(0,0,100,100);
  var r = 0;
  var g = 0;
  var b = 0;
  for (let i = 0; i < imageData.data.length; i += 4) {
    r += imageData.data[i + 0];
    g += imageData.data[i + 1];
    b += imageData.data[i + 2];
  }
  r = Math.floor(r/(imageData.data.length/4));
  g = Math.floor(g/(imageData.data.length/4));
  b = Math.floor(b/(imageData.data.length/4));
  song.style.borderColor = 'rgba(' + r + ', ' + g + ', ' + b + ', 1)';
  song.classList.add('visible');
}

function openPage(selection){
  // loadScripts();
  if(selection.id == 'search-btn'){
    document.getElementById('search-input').style.display = "block";
    document.getElementById('results').innerHTML = '';
    document.getElementById('content').justifyContent = "center";
  }else if(selection.id == 'explore-btn'){

    document.getElementById('results').innerHTML = "Loading...";

    // Revert Changes
    document.getElementById('content').justifyContent = "flex-start";
    document.getElementById('search-input').style.display = "none";


    socket.emit('explore', {uid: unique_id});
    // socket.emit('recommend', {uid: unique_id});
    socket.on('explore-response', res=>{
      let result_box = document.getElementById('results');
      result_box.innerHTML = '';
      let data = res;
      populateResults(result_box, data.songs);
    });
  }
}

function populateResults(result_box, songs){
  for(var i = 0; i < songs.length; i++){
    let uri = songs[i].uri;
    let img = songs[i].img;
    let id = songs[i].id;
    let title = songs[i].title;
    let artist = songs[i].artist
    let uuid = unique_id;

    let song = document.createElement('div');
    song.classList.add('song-item')
    song.addEventListener('click', ()=>{
      socket.emit('play', {uri: uri, uid: uuid});
      song.style.animation = "selectSongItem .3s ease-out 1 forwards";
    }); 
    
    let image = document.createElement('img');
    image.classList.add('img-item');
    image.src = img;
    image.crossOrigin = "Anonymous";
    image.onload = function(){
      getAverageColor(image, song);
    };

    let text_container = document.createElement('div');
    text_container.classList.add('text-container');

    let text = document.createElement('p');
    text.innerHTML = title + `<br><span class='artist-text'>` + artist + `</span>`;
    
    text_container.insertAdjacentElement('beforeend', text);
    song.insertAdjacentElement('beforeend', image);
    song.insertAdjacentElement('beforeend', text_container);

    result_box.insertAdjacentElement('beforeend', song);
  }
}

function load(page, callback){
  fetch(page).then(resp=>resp.text()).then(res=>{
    document.body.innerHTML = res;
    if(callback !== undefined){
      callback();
    }
  });
}

// function setNavLabel(text){
//   document.getElementById('nav-label').innerHTML = text;
// }

var token;

function loadScripts(){
  let script = document.createElement('script');
  script.src = "https://sdk.scdn.co/spotify-player.js";
  document.body.insertAdjacentElement('beforeend', script);

  
      window.onSpotifyWebPlaybackSDKReady = () => {
    token = 'BQDCJe9eVUb2OmC-ilLL_kRW2BjOA1ZG63CiDLVMIyTMKM8bhPIUlOvO9l0zRJ2Nyf3y2GSnLNCOHBNiLdQcWz9mDJI_ymkQQp9puFHrQVriZcKVh7S19OkRu7qEBqIMz8ertNF368j8dsoxdSKB8Qfs4671-y8yyMxk9TUtod_IzV_ga-tUvyBE7w';
    const player = new Spotify.Player({
      name: 'MazPlayer',
      getOAuthToken: cb => { cb(token); }
    });

    // Error handling
    player.addListener('initialization_error', ({ message }) => { console.error(message); });
    player.addListener('authentication_error', ({ message }) => { console.error(message); });
    player.addListener('account_error', ({ message }) => { console.error(message); });
    player.addListener('playback_error', ({ message }) => { console.error(message); });

    // Playback status updates
    player.addListener('player_state_changed', state => { console.log(state); });

    // Ready
    player.addListener('ready', ({ device_id }) => {
      console.log('Ready with Device ID', device_id);
    });

    // Not Ready
    player.addListener('not_ready', ({ device_id }) => {
      console.log('Device ID has gone offline', device_id);
    });

    // Connect to the player!
    player.connect();
    setTimeout(function(){
      socket.emit('switch', {uid: unique_id});
    }, 500)
  };
}

// function restExample(){
//   socket.emit('rest-example', {uid: unique_id});
// }