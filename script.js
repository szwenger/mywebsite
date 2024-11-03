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

  document.getElementById('hardwareButton').addEventListener('click', function () {
    document.getElementById('content').innerHTML = `
      <h1>Hardware</h1>
        <p>Here you can find information about the hardware I use for my projects.</p>
        <h2>Network-Attached-Storage (NAS)</h2>
        <p>For my NAS project, I am using the following hardware:</p>
        <ul>
          <li>Case: <a href="https://www.fractal-design.com/products/cases/node/node-804/black/" target="_blank">Fractal Design Node 804</a></li>
          <li>Power Supply: <a href="https://www.corsair.com/eu/en/Categories/Products/Power-Supply-Units/Power-Supply-Units-Advanced/RMx-Series/p/CP-9020179-EU" target="_blank">Corsair RM850x</a></li>
          <li>Mainboard: <a href="https://www.asrock.com/mb/Intel/H370M-ITXac/index.asp" target="_blank">ASRock H370M-ITX/ac</a></li>
          <li>Processor: <a href="https://ark.intel.com/content/www/us/en/ark/products/126687/intel-core-i3-8100-processor-6m-cache-3-60-ghz.html" target="_blank">Intel Core i3-8100</a></li>
          <li>RAM: <a href="https://www.corsair.com/eu/en/Categories/Products/Memory/VENGEANCE-LPX/p/CMK16GX4M2B3000C15" target="_blank">Corsair Vengeance LPX 16GB</a></li>
          <li>Hard Drives: 3x <a href="https://www.seagate.com/internal-hard-drives/hdd/ironwolf/" target="_blank">Seagate IronWolf 12TB</a></li>
          
        </ul>
        <p>My main pc has the following hardware components:</p>
        <h2>PC Setup</h2><ul>
        <li>Case: <a href="https://amzn.eu/d/4hkrHid">Cooler Master MasterBox TD500 Mesh</a></li>
        <li>CPU: <a href="https://amzn.eu/d/9HwxtbE">Intel&reg; Core™ i5-13600K</a></li>
        <li>GPU: <a href="https://amzn.eu/d/5oOMUjF">AMD RX 6800XT</a></li>
        <li>RAM: <a href="https://amzn.eu/d/4JcwcsO">Gskill F4-3200C16D-32GVK (2 x 16 GB)</a></li>
        <li>Mainboard: <a href="https://amzn.eu/d/b3DLYPB"><i>Gigabyte</i>&reg; Z690 UD DDR4</a></li>
        <li>Operating System: <a href="https://www.microsoft.com/de-de/d/windows-11-pro/dg7gmgf0d8h4/000P">Windows 11 Pro (64 Bit)</a></li>
        <li>Mouse: <a href="https://amzn.eu/d/deVYJgk">Logitech G305</a></li>
        <li>Keyboard: <a href="https://amzn.eu/d/3x2ZswV">HyperX Alloy Origins 60 (HyperX Red) (US)</a></li>
        <li>Mousepad: <a href="https://www.amazon.com/SteelSeries-QcK-Gaming-Mouse-Black/dp/B000UVRU6G/ref=sr_1_1?ie=UTF8&qid=1484578950&sr=8-1&keywords=Steelseries+QcK%2B">Steelseries QcK+</a></li>
        <li>1st Monitor: <a href="https://amzn.eu/d/aVYspWD">AOC Gaming Q27G2U - 27 Zoll QHD Monitor, 144 Hz, 1ms</a></li>
        <li>2nd Monitor: <a href="https://a.co/d/9RJIAvi">BenQ GL2450 24 Zoll LED-Monitor (60 Hz)</a></li>
        <li>3rd Monitor (vertical): Lenovo ThinkVision</li>
        </ul>
        <h3>Headset</h3>
        <p><a href="https://amzn.eu/d/6Mxrhpq"><i>beyerdynamic</i> DT 880 BLACK SPECIAL EDITION</a> + <a href="https://www.amazon.de/gp/product/B00WGAT56W/ref=ppx_yo_dt_b_asin_title_o07_s01?ie=UTF8&th=1"><i>Shure</i> PGA48XLR</a></p>
        <p><a href="https://www.amazon.de/gp/product/B00FFIGZF6/ref=ppx_yo_dt_b_asin_title_o07_s01?ie=UTF8&psc=1"><i>Behringer</i> U-PHORIA UMC22</a></p>
      
        <h3>VR Headset</h3>
        <p><a href="https://www.oculus.com/quest-2/">Oculus Quest 2</a></p>
    `;
  });
});

