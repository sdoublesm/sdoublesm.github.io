fetch('https://api.spotify.com/v1/me/player/recently-played', {
    method: 'GET',
    headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer BQC7JygSk4ea8UXlBz7yf8eLKrgxfwVU_OcC0FP2iYdl7VLfbilrxV-4xpRjr_Gym2w-CNQ6CesP_og3dtuIkQatkXpAOTh3SxKVB6l26NTOt3R9VdwNpBg02qkT1uk3eIjqTy4uYoXnaF91G9AWb63WT3vQdeXxLzIsQhgXJ1OsxvPYnw1hsUOk_jiGNlu6VWhB'
    },
})
.then(response => response.text())
.then(text => {
    songname = JSON.parse(text)["items"][0]["track"]["name"]
    artist = JSON.parse(text)["items"][0]["track"]["artists"][0]["name"]
    document.getElementById("output").innerHTML = "'" + songname + "'" + " by " + artist
});
