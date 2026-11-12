const video = document.getElementById('camera-feed');
const button = document.getElementById('capture-button');
const imageContainer = document.getElementById('image-container');
const dataurl = document.getElementById('dataurl');
const preview = document.getElementById('preview');
const cameraStatus = document.getElementById('camera-status');
const retryButton = document.getElementById('try-again-button');
let cameraStream = null;

if (preview) {
  preview.width = 320;
  preview.height = 280;
}

function showCameraStatus(message) {
  if (cameraStatus) {
    cameraStatus.textContent = message;
    cameraStatus.classList.remove('hidden');
  }
}

async function startCamera() {
  const showCameraError = (message) => {
    showCameraStatus(message);
  };

  if (!video) {
    return;
  }

  if (!window.isSecureContext) {
    showCameraError('Camera access requires HTTPS or localhost. Open this page from a local web server.');
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    showCameraError('This browser does not support camera access.');
    return;
  }

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    video.srcObject = cameraStream;
    await video.play();
    if (cameraStatus) {
      cameraStatus.classList.add('hidden');
    }
  } catch (error) {
    console.error('Camera access failed:', error);
    stopCamera();
    video.poster = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="320" height="280" viewBox="0 0 320 280"%3E%3Crect width="320" height="280" fill="%23000"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23fff" font-size="20" font-family="Arial"%3ECamera unavailable%3C/text%3E%3C/svg%3E';
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      showCameraError('Camera permission was denied. Allow camera access in your browser settings, then reload.');
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      showCameraError('No camera was found. Connect a camera and reload.');
    } else {
      showCameraError('Could not start the camera. Check browser permissions and that no other app is using it.');
    }
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }

  if (video) {
    video.pause();
    video.srcObject = null;
  }
}

startCamera();

if (button) {
  button.addEventListener('click', async () => {
    if (!video || !video.videoWidth || !video.videoHeight) {
      showCameraStatus('The camera is not ready yet. Please wait and try again.');
      return;
    }

    button.disabled = true;
    if (retryButton) {
      retryButton.hidden = true;
    }
    showCameraStatus('Checking your smile...');

    try {
      const maxDimension = 1280;
      const scale = Math.min(1, maxDimension / Math.max(video.videoWidth, video.videoHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);

      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (preview) {
        preview.width = canvas.width;
        preview.height = canvas.height;
        const previewContext = preview.getContext('2d');
        previewContext.clearRect(0, 0, preview.width, preview.height);
        previewContext.drawImage(canvas, 0, 0, preview.width, preview.height);
      }

      const imageBase64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
      const response = await fetch('/api/detect-smile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 })
      });
      const responseText = await response.text();
      let result = null;

      if (responseText.trim()) {
        try {
          result = JSON.parse(responseText);
        } catch {
          throw new Error(`Smile detection returned an invalid response (HTTP ${response.status}).`);
        }
      }

      if (!response.ok) {
        const message = result && typeof result.error === 'string'
          ? result.error
          : response.status === 404
            ? 'The smile detection API route is missing. Redeploy the latest version.'
            : `Smile detection failed (HTTP ${response.status}).`;
        throw new Error(message);
      }

      if (!result || typeof result.isSmiling !== 'boolean' || typeof result.faceDetected !== 'boolean') {
        throw new Error(`Smile detection returned an empty or incomplete response (HTTP ${response.status}).`);
      }

      if (result.isSmiling) {
        window.location.assign('./fun.html');
        return;
      }

      showCameraStatus(result.faceDetected
        ? 'No smile detected. Please smile and try again.'
        : 'No face detected. Move into the frame and try again.');
    } catch (error) {
      console.error('Smile detection failed:', error);
      showCameraStatus(error.message || 'Smile detection failed. Please try again.');
    } finally {
      stopCamera();
      button.disabled = false;
      if (retryButton) {
        retryButton.hidden = false;
      }
    }
  });
}

if (retryButton) {
  retryButton.addEventListener('click', () => window.location.reload());
}

window.addEventListener('pagehide', stopCamera);




