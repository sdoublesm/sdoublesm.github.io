fetch('https://api.spotify.com/v1/me/player/recently-played', {
    method: 'GET',
    headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer BQAeeke6tMz6jGDStXTfBCfj9I1IPlRAv_-PmvGdpuDSqef_3SR6vCNNy-elOyc81hbX43Un_1jx2gcQwRhmDPjTKhwPHXh_wo3gJuc34cppL8OZssVJE3dNKeSTaWGf8NHOAvoWK3Vr2kakylMjRmu7NOx0TCkk5Ke-bt3DrOp69aRUSFJOYgpnMagn5Mudvanf76I'
    },
})
.then(response => response.text())
.then(text => {
    songname = JSON.parse(text)["items"][0]["track"]["name"]
    artist = JSON.parse(text)["items"][0]["track"]["artists"][0]["name"]
    time = JSON.parse(text)["items"][0]["played_at"]

    var d = new Date(time);
    t = d.toString().split(" ")
    console.log(t)
    timeString = t[1] + " " + t[2] + ", " + t[3] + " at " + t[4]
    console.log(timeString)


    document.getElementById("output").innerHTML = "'" + songname + "'" + " by " + artist + "<br>on " + timeString
});
