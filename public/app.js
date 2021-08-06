function startApp(){
    document.getElementById('centerer').style.justifyContent = 'start';
    document.getElementById('search-input').addEventListener('keyup', e=>{
        if(e.keyCode == 13){
            request();
            document.getElementById('results').innerHTML = "Loading...";
        }
    });
}


