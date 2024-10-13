document.addEventListener('DOMContentLoaded', function () {
  function showTime() {
    document.getElementById('currentTime').innerHTML = new Date().toUTCString();
  }
  showTime();
  setInterval(showTime, 1000);

  function loadContent(url, elementId) {
    fetch(url)
      .then(response => response.text())
      .then(data => {
        document.getElementById(elementId).innerHTML = data;
      })
      .catch(error => console.error('Error loading content:', error));
  }

  // Load home content on initial page load
  loadContent('homeContent.html', 'content');

  document.getElementById('homeButton').addEventListener('click', function () {
    loadContent('homeContent.html', 'content');
  });

  document.getElementById('subMenuButton').addEventListener('click', function () {
    document.getElementById('content').innerHTML = `
      <h2>Youtube</h2>
      <p>Check out this video:</p>
      <iframe width="560" height="315" src="https://www.youtube.com/embed/Fy9UYGzPVG8" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
    `;
  });

  document.getElementById('blogButton').addEventListener('click', function () {
    document.getElementById('content').innerHTML = `
      <h2>7th October 2024</h2>
      <p>This is my personal blog, currently WIP. I will soon be dumping all of my personal thoughts and stuff here! So bookmark, if you want to follow along my journey.</p>
      <h2>8th October 2024</h2>
      <p>As you can probably tell, this website is pretty bare right now. This will change over time, because as I get more and more used to HTML5 coding, this website will get more and more advanced.</p>
      <h2>13th October 2024</h2>
      <p>I have added a new page to the website, called "Content Creation". This page will be used to showcase all of my content creation work, such as videos, images, and more. I will be updating this page irregularly, so make sure to check it out! <br>
      Also, my project of the Network-Attached-Storage (NAS) is taking big steps forward. The carcase is finished, and the system is set up to accept the 3 12TB hard drives that will be ordered soon.</p>
    `;
  });
});