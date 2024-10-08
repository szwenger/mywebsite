function showTime() {
  document.getElementById('currentTime').innerHTML = new Date().toUTCString();
}
showTime();
setInterval(function () {
  showTime();
}, 1000);

document.getElementById('homeButton').addEventListener('click', function() {
  document.getElementById('content').innerHTML = `
    <h2>7th October 2024</h2>
    <p>This is my personal blog, currently WIP. I will soon be dumping all of my personal thoughts and stuff here! So bookmark, if you want to follow along my journey.</p>
    <h2>8th October 2024</h2>
    <p>As you can probably tell, this website is pretty bare right now. This will change over time, because as I get more and more used to html5 coding, this website will get more and more advanced.</p>
  `;
});

document.getElementById('subMenuButton').addEventListener('click', function() {
  document.getElementById('content').innerHTML = `
    <h2>Youtube</h2>
    <p></p>
    <iframe width="560" height="315" src="https://www.youtube.com/embed/Fy9UYGzPVG8" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
  `;
});