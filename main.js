const video = document.getElementById('camera-feed');
const button = document.getElementById('capture-button');
const imageContainer = document.getElementById('image-container');
const dataurl = document.getElementById('dataurl');
const preview = document.getElementById('preview');


async function loadEnvConfig() {
  if (window.__ENV__) {
    return window.__ENV__;
  }

  try {
    const response = await fetch('./keys.env');
    if (!response.ok) {
      throw new Error(`Could not load env file: ${response.status}`);
    }

    const text = await response.text();
    const values = {};

    text.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return;
      }

      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) {
        return;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
      values[key] = value;
    });

    window.__ENV__ = values;
    return values;
  } catch (error) {
    console.warn('Using built-in fallback values because the env file could not be loaded.', error);
    return {};
  }
}

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    video.srcObject = stream;
    await video.play();
  } catch (error) {
    console.error('Camera access failed:', error);
    video.poster = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="320" height="280" viewBox="0 0 320 280"%3E%3Crect width="320" height="280" fill="%23000"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23fff" font-size="20" font-family="Arial"%3ECamera unavailable%3C/text%3E%3C/svg%3E';
  }
}

startCamera();

button.addEventListener('click', async () => {
      const envConfig = await loadEnvConfig();
      const apiKey = envConfig.FACE_API_KEY ;
      const apiSecret = envConfig.FACE_API_SECRET ;

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      preview.src = canvas.toDataURL("image/png");


      var base64String = preview.src.split(',')[1];

      $.ajax({
        url: "https://api-us.faceplusplus.com/facepp/v3/detect",
        type: "POST",
        data: {
          api_key: apiKey,
          api_secret: apiSecret,
          image_base64: base64String,
          return_attributes: "smiling"
        }
      })
      .done(function(response) {
        if (response.faces && response.faces.length > 0) {
            console.log(JSON.stringify(response, null, 2));
            var smileValue = response.faces[0].attributes.smile;
            var isSmiling = smileValue.value > smileValue.threshold;
            if (isSmiling) {
                window.open("fun.html", "_blank");
            } else {
                alert("No smile detected. Please try again.");
            }
        }
    })
    .fail(function(jqXHR) {
        console.error(jqXHR.responseText);
    });
      video.pause();
      video.srcObject = null;

});



