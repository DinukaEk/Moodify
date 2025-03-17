from flask import Flask, render_template, Response, redirect, url_for, jsonify
import cv2
import numpy as np
import tensorflow as tf
import base64
from PIL import Image
import io

app = Flask(__name__)

# Load the emotion detection model
model = None

def load_model():
    global model
    try:
        model = tf.keras.models.load_model('emotion_detection_model.h5')
        print("Model loaded successfully!")
    except Exception as e:
        print(f"Error loading model: {str(e)}")

# Song recommendations for each emotion (same as in your Streamlit app)
emotion_songs = {
    "Angry": [
        {"title": "Break Stuff", "artist": "Limp Bizkit", "url": "https://open.spotify.com/track/5cZqsjJuBIcjqyVaZd5Ill"},
        {"title": "Bulls On Parade", "artist": "Rage Against The Machine", "url": "https://open.spotify.com/track/1Dj3C4NOtWo7ETBv2ThrPD"},
        {"title": "Master Of Puppets", "artist": "Metallica", "url": "https://open.spotify.com/track/2MuWTIM3b0YEAskbeeFE1i"},
        {"title": "Killing In The Name", "artist": "Rage Against The Machine", "url": "https://youtu.be/bWXazVhlyxQ"}
    ],
    "Disgust": [
        {"title": "Creep", "artist": "Radiohead", "url": "https://open.spotify.com/track/70LcF31zb1H0PyJoS1Sx1r"},
        {"title": "Somebody That I Used To Know", "artist": "Gotye", "url": "https://open.spotify.com/track/1qDrWA6lyx8cLECdZE7TV7"},
        {"title": "Seven Nation Army", "artist": "The White Stripes", "url": "https://open.spotify.com/track/7i6r9KotUPQg3ozKKgEPIN"},
        {"title": "Loser", "artist": "Beck", "url": "https://youtu.be/YgSPaXgAdzE"}
    ],
    "Fear": [
        {"title": "Thriller", "artist": "Michael Jackson", "url": "https://open.spotify.com/track/2LlQb7Uoj1kKyLZnCCXvyS"},
        {"title": "Everybody's Scared", "artist": "Lenka", "url": "https://open.spotify.com/track/0KbHuWNqhQbYQvZwzSZGTj"},
        {"title": "Fear of the Dark", "artist": "Iron Maiden", "url": "https://open.spotify.com/track/5C4TQZWf4pTWugCrzhXl6X"},
        {"title": "Enter Sandman", "artist": "Metallica", "url": "https://youtu.be/CD-E-LDc384"}
    ],
    "Happy": [
        {"title": "Happy", "artist": "Pharrell Williams", "url": "https://open.spotify.com/track/60nZcImufyMA1MKQY3dcCO"},
        {"title": "Don't Stop Me Now", "artist": "Queen", "url": "https://open.spotify.com/track/5T8EDUDqKcs6OSOwEsfqG7"},
        {"title": "Walking On Sunshine", "artist": "Katrina & The Waves", "url": "https://open.spotify.com/track/05wIrZSwuaVWhcv5FfqeH0"},
        {"title": "Can't Stop The Feeling", "artist": "Justin Timberlake", "url": "https://youtu.be/ru0K8uYEZWw"}
    ],
    "Neutral": [
        {"title": "Comfortably Numb", "artist": "Pink Floyd", "url": "https://open.spotify.com/track/6LbVJ5Kh8aQCnaSsNZfZXx"},
        {"title": "Breathe", "artist": "Télépopmusik", "url": "https://open.spotify.com/track/0PG9fbaaHFHfre2gUVo7AN"},
        {"title": "No Surprises", "artist": "Radiohead", "url": "https://open.spotify.com/track/10nyNJ6zNy2YVYLrcwLccB"},
        {"title": "Marconi Union - Weightless", "artist": "Marconi Union", "url": "https://youtu.be/UfcAVejslrU"}
    ],
    "Sad": [
        {"title": "Someone Like You", "artist": "Adele", "url": "https://open.spotify.com/track/1aFuEGnSXz33jJzLZMqk28"},
        {"title": "Hurt", "artist": "Johnny Cash", "url": "https://open.spotify.com/track/28cnXtME493VX9NOw9cIUh"},
        {"title": "Fix You", "artist": "Coldplay", "url": "https://open.spotify.com/track/7LVHVU3tWfcxj5aiPFEW4Q"},
        {"title": "Mad World", "artist": "Gary Jules", "url": "https://youtu.be/4N3N1MlvVc4"}
    ],
    "Surprise": [
        {"title": "Wow", "artist": "Post Malone", "url": "https://open.spotify.com/track/7fvUMiyapMsNXnM6Y9taEv"},
        {"title": "Starboy", "artist": "The Weeknd", "url": "https://open.spotify.com/track/7MXVkk9YMctZqd1Srtv4MB"},
        {"title": "Uprising", "artist": "Muse", "url": "https://open.spotify.com/track/4VqPOruhp5EdPBeR92t6lQ"},
        {"title": "Radioactive", "artist": "Imagine Dragons", "url": "https://youtu.be/ktvTqknDobU"}
    ]
}

# Helper function to convert YouTube URLs to embedded format
def get_embedded_player(url):
    if "youtube.com" in url or "youtu.be" in url:
        # Extract YouTube video ID
        if "youtube.com" in url:
            if "watch?v=" in url:
                video_id = url.split("watch?v=")[1].split("&")[0]
            else:
                video_id = url.split("/")[-1]
        elif "youtu.be" in url:
            video_id = url.split("/")[-1]
        
        # Return YouTube embedded player HTML
        return f'<iframe width="100%" height="315" src="https://www.youtube.com/embed/{video_id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>'
    
    elif "spotify.com" in url:
        # Extract Spotify track ID
        if "track/" in url:
            track_id = url.split("track/")[1]
            # Return Spotify embedded player HTML
            return f'<iframe src="https://open.spotify.com/embed/track/{track_id}" width="100%" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>'
    
    # Return a link if we can't embed
    return f'<a href="{url}" target="_blank">Open in new tab</a>'

# Function to detect emotion in an image
def detect_emotion(image):
    global model
    
    # Convert PIL image to cv2 format if needed
    if isinstance(image, Image.Image):
        opencv_img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    else:
        opencv_img = image
    
    # Create a copy for drawing on
    display_img = opencv_img.copy()
    
    # Convert to grayscale
    gray = cv2.cvtColor(opencv_img, cv2.COLOR_BGR2GRAY)
    
    # Load the pre-trained face cascade classifier
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    
    # Detect faces
    faces = face_cascade.detectMultiScale(gray, 1.1, 4)
    
    results = []
    
    # If no faces found
    if len(faces) == 0:
        return display_img, [], "No faces detected"
    
    # Draw rectangle around faces and predict emotion
    for (x, y, w, h) in faces:
        # Extract face ROI
        face_roi = gray[y:y+h, x:x+w]
        
        # Resize to match model input size (48x48)
        face_roi = cv2.resize(face_roi, (48, 48))
        
        # Prepare image for prediction
        face_roi = face_roi.astype("float") / 255.0
        face_roi = np.expand_dims(face_roi, axis=0)
        face_roi = np.expand_dims(face_roi, axis=-1)
        
        # Make prediction
        prediction = model.predict(face_roi)
        emotion_labels = ['Angry', 'Disgust', 'Fear', 'Happy', 'Neutral', 'Sad', 'Surprise']
        emotion = emotion_labels[np.argmax(prediction)]
        probability = float(np.max(prediction))
        
        # Get emotional color
        emotion_colors = {
            "Angry": (0, 0, 255),      # Red
            "Disgust": (0, 128, 128),  # Brown
            "Fear": (128, 0, 128),     # Purple
            "Happy": (0, 255, 255),    # Yellow
            "Neutral": (128, 128, 128),# Gray
            "Sad": (255, 0, 0),        # Blue
            "Surprise": (0, 165, 255)  # Orange
        }
        color = emotion_colors.get(emotion, (0, 255, 0))
        
        # Draw rectangle and emotion label
        cv2.rectangle(display_img, (x, y), (x+w, y+h), color, 2)
        cv2.putText(display_img, f"{emotion}: {probability:.2f}", 
                    (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, 
                    color, 2)
        
        results.append({
            'emotion': emotion,
            'probability': probability,
            'position': (x, y, w, h)
        })

        results = [item for sublist in results for item in sublist]
    
    # Determine the dominant emotion
    if results:
        dominant_emotion = max(results, key=lambda x: x['probability'])['emotion']
    else:
        dominant_emotion = None
    
    return display_img, results, dominant_emotion

# For webcam streaming in real-time
def generate_frames():
    # Initialize the webcam
    camera = cv2.VideoCapture(0)
    
    # Check if the model is loaded
    if model is None:
        load_model()
    
    while True:
        success, frame = camera.read()
        if not success:
            break
        
        # Process the frame for emotion detection
        result_frame, predictions, dominant_emotion = detect_emotion(frame)
        
        # Add text for dominant emotion
        if dominant_emotion:
            cv2.putText(result_frame, f"Dominant Emotion: {dominant_emotion}", 
                        (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, 
                        (0, 255, 0), 2)
        
        # Convert to JPEG for streaming
        ret, buffer = cv2.imencode('.jpg', result_frame)
        frame_bytes = buffer.tobytes()
        
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        
    camera.release()

# For processing a single frame and returning the emotion
def process_frame(frame_data):
    if model is None:
        load_model()
    
    # Decode the base64 image
    image_data = base64.b64decode(frame_data.split(',')[1])
    image = Image.open(io.BytesIO(image_data))
    
    # Convert to OpenCV format
    opencv_img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    
    # Detect emotion
    _, predictions, dominant_emotion = detect_emotion(opencv_img)
    
    if not dominant_emotion:
        return {"error": "No face detected"}
    
    if isinstance(dominant_emotion, list) and dominant_emotion:
        dominant_emotion = dominant_emotion[0]  # Take the first item if it's a list
    
    # Return the dominant emotion and song recommendations
    return {
        "dominant_emotion": dominant_emotion,
        "recommendations": emotion_songs.get(dominant_emotion, [])
    }

# Routes
@app.route('/')
def welcome():
    return render_template('welcome.html')

@app.route('/detect')
def detect():
    return render_template('detect.html')

@app.route('/recommendations')
def recommendations():
    return render_template('recommendations.html')

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/process_emotion', methods=['POST'])
def process_emotion():
    from flask import request
    data = request.json
    frame_data = data.get('image')
    
    result = process_frame(frame_data)
    return jsonify(result)

if __name__ == '__main__':
    load_model()
    import os
    app.run(debug=False, host='0.0.0.0', port=int(os.environ.get("PORT", 10000)))
