from flask import Flask, render_template, Response, redirect, url_for, jsonify, request, session, flash, send_file
import cv2
import numpy as np
import tensorflow as tf
import base64
from PIL import Image
import io
import os
from werkzeug.security import generate_password_hash, check_password_hash
import psycopg2
import psycopg2.extras
import uuid
from functools import wraps
from urllib.parse import urlparse
import time
from flask_mail import Mail, Message
from itsdangerous import URLSafeTimedSerializer
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import json
import re

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', os.urandom(24))  # Secret key for sessions
app.config['SESSION_COOKIE_SECURE'] = True
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = 1800  # 30 minutes

app.config['MAIL_SERVER'] = 'smtp.gmail.com'  # or your email provider's SMTP server
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')  # Your email
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')  # Your email password or app password
app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_USERNAME')

mail = Mail(app)

# Create a serializer for generating secure tokens
serializer = URLSafeTimedSerializer(app.secret_key)


# Database setup with PostgreSQL
def get_db_connection():
    """Connect to the PostgreSQL database server"""
    # Get database URL from environment variable (Render provides this)
    database_url = os.environ.get('DATABASE_URL', 'postgresql://moodify_kpky_user:w9XtD21cCd3yNtpfPxjWSWupyByiozar@dpg-d0nier6uk2gs73c14f8g-a.oregon-postgres.render.com/moodify_kpky')
    
    # Parse the URL to get connection parameters
    parsed_url = urlparse(database_url)
    
    # Connect to the PostgreSQL server
    conn = psycopg2.connect(
        host=parsed_url.hostname,
        database=parsed_url.path[1:],
        user=parsed_url.username,
        password=parsed_url.password,
        port=parsed_url.port
    )
    
    # Create cursor with dictionary-like results
    conn.cursor_factory = psycopg2.extras.DictCursor
    
    return conn

# In the init_db() function, add these new tables:
def init_db():
    """Initialize the database tables if they don't exist"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        avatar_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Create user_language_preferences table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS user_language_preferences (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        language TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
    ''')
    
    # Create user_history table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS user_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        emotion TEXT NOT NULL,
        song_id TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    
    # Create songs table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS songs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        url TEXT NOT NULL,
        emotion TEXT NOT NULL,
        language TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # Add password reset tokens table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    
    conn.commit()
    cursor.close()
    conn.close()

# Check your database connection code
try:
    get_db_connection()  # or whatever connection method you're using
except Exception as e:
    print(f"Database connection error: {e}")  # Add proper logging

# Login required decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# Load the emotion detection model
model = None

def load_model():
    global model
    try:
        model = tf.keras.models.load_model('emotion_detection_model.h5')
        print("Model loaded successfully!")
    except Exception as e:
        print(f"Error loading model: {str(e)}")

# Helper function to send email
def send_reset_email(user_email, reset_token):
    """Send password reset email to user"""
    try:
        # Create reset URL
        reset_url = url_for('reset_password', token=reset_token, _external=True)
        
        # Email content
        subject = "Password Reset Request - Moodify"
        body = f"""
        Hello,

        You requested to reset your password for your Moodify account.

        Please click the link below to reset your password:
        {reset_url}

        This link will expire in 1 hour.

        If you didn't request this password reset, please ignore this email.

        Best regards,
        The Moodify Team
        """

        # Create message
        msg = MIMEMultipart()
        msg['From'] = app.config['MAIL_USERNAME']
        msg['To'] = user_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        # Send email
        server = smtplib.SMTP(app.config['MAIL_SERVER'], app.config['MAIL_PORT'])
        server.starttls()
        server.login(app.config['MAIL_USERNAME'], app.config['MAIL_PASSWORD'])
        server.send_message(msg)
        server.quit()
        
        return True
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        return False

# Helper functions for user management
def get_user_by_id(user_id):
    """Get user data by ID from database"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, name, username, email, avatar_data, created_at, is_admin
        FROM users WHERE id = %s
    ''', (user_id,))
    
    user = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if user:
        return dict(user)
    return None

def get_user_by_email(email):
    """Get user data by email from database"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, name, username, email, password, avatar_data, created_at, is_admin
        FROM users WHERE email = %s
    ''', (email,))
    
    user = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if user:
        return dict(user)
    return None

def update_user_profile(user_id, name, email):
    """Update user profile in database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE users SET name = %s, email = %s WHERE id = %s
        ''', (name, email, user_id))
        
        conn.commit()
        success = cursor.rowcount > 0
        cursor.close()
        conn.close()
        
        return success
    except Exception as e:
        print(f"Error updating profile: {e}")
        return False

def update_user_password(user_id, hashed_password):
    """Update user password in database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE users SET password = %s WHERE id = %s
        ''', (hashed_password, user_id))
        
        conn.commit()
        success = cursor.rowcount > 0
        cursor.close()
        conn.close()
        
        return success
    except Exception as e:
        print(f"Error updating password: {e}")
        return False

def update_user_avatar(user_id, image_data):
    """Update user avatar in database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE users SET avatar_data = %s WHERE id = %s
        ''', (image_data, user_id))
        
        conn.commit()
        success = cursor.rowcount > 0
        cursor.close()
        conn.close()
        
        return success
    except Exception as e:
        print(f"Error updating avatar: {e}")
        return False

def get_user_statistics(user_id):
    """Get user statistics from database"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get emotion detections count
    cursor.execute('''
        SELECT COUNT(*) FROM user_history WHERE user_id = %s
    ''', (user_id,))
    emotion_detections = cursor.fetchone()[0]
    
    # Get songs played count (where song_id is not null)
    cursor.execute('''
        SELECT COUNT(*) FROM user_history WHERE user_id = %s AND song_id IS NOT NULL
    ''', (user_id,))
    songs_played = cursor.fetchone()[0]
    
    # Get unique emotions detected
    cursor.execute('''
        SELECT COUNT(DISTINCT emotion) FROM user_history WHERE user_id = %s
    ''', (user_id,))
    unique_emotions = cursor.fetchone()[0]
    
    cursor.close()
    conn.close()
    
    return {
        'emotion_detections_count': emotion_detections,
        'songs_played_count': songs_played,
        'unique_emotions_count': unique_emotions
    }

def get_user_activity_data(user_id, page, limit):
    """Get user activity data with pagination"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    offset = (page - 1) * limit
    
    cursor.execute('''
        SELECT uh.emotion, s.title, s.artist, uh.timestamp, uh.song_id
        FROM user_history uh
        LEFT JOIN songs s ON uh.song_id = s.id
        WHERE uh.user_id = %s
        ORDER BY uh.timestamp DESC
        LIMIT %s OFFSET %s
    ''', (user_id, limit, offset))
    
    activities = []
    for row in cursor.fetchall():
        if row[4]:  # If song_id exists
            title = f"Listened to {row[2]} by {row[3]}"
            description = f"Emotion detected: {row[0]}"
        else:
            title = f"{row[0]} emotion detected"
            description = "Emotion detection session"
        
        activities.append({
            'emotion': row[0],
            'title': title,
            'description': description,
            'timestamp': row[3].isoformat() if row[3] else None
        })
    
    cursor.close()
    conn.close()
    
    return activities

def get_complete_user_data(user_id):
    """Get complete user data for download"""
    user_data = get_user_by_id(user_id)
    activities = get_user_activity_data(user_id, 1, 1000)  # Get all activities
    stats = get_user_statistics(user_id)
    languages = get_user_language_preferences(user_id)
    
    return {
        'user_info': user_data,
        'statistics': stats,
        'language_preferences': languages,
        'activity_history': activities,
        'export_date': datetime.now().isoformat()
    }

def clear_user_activity_history(user_id):
    """Clear user activity history from database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            DELETE FROM user_history WHERE user_id = %s
        ''', (user_id,))
        
        conn.commit()
        success = cursor.rowcount >= 0  # >= 0 because even 0 deletions is successful
        cursor.close()
        conn.close()
        
        return success
    except Exception as e:
        print(f"Error clearing activity history: {e}")
        return False

def delete_user_account(user_id):
    """Delete user account and all associated data"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Delete user history
        cursor.execute('DELETE FROM user_history WHERE user_id = %s', (user_id,))
        
        # Delete user language preferences
        cursor.execute('DELETE FROM user_language_preferences WHERE user_id = %s', (user_id,))
        
        # Delete password reset tokens
        cursor.execute('DELETE FROM password_reset_tokens WHERE user_id = %s', (user_id,))
        
        # Delete user
        cursor.execute('DELETE FROM users WHERE id = %s', (user_id,))
        
        conn.commit()
        success = cursor.rowcount > 0
        cursor.close()
        conn.close()
        
        return success
    except Exception as e:
        print(f"Error deleting account: {e}")
        return False

def is_valid_email(email):
    """Validate email format"""
    pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    return re.match(pattern, email) is not None

# Route for forgot password page
@app.route('/forgot_password', methods=['GET', 'POST'])
def forgot_password():
    if 'user_id' in session:
        return redirect(url_for('welcome'))
    
    if request.method == 'POST':
        email = request.form['email']
        
        if not email:
            flash('Please enter your email address')
            return render_template('forgot_password.html')
        
        # Check if user exists
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users WHERE email = %s', (email,))
        user = cursor.fetchone()
        
        if user:
            # Generate reset token
            reset_token = serializer.dumps(email, salt='password-reset-salt')
            token_id = str(uuid.uuid4())
            expires_at = datetime.now() + timedelta(hours=1)
            
            # Store token in database
            cursor.execute('''
                INSERT INTO password_reset_tokens (id, user_id, token, expires_at)
                VALUES (%s, %s, %s, %s)
            ''', (token_id, user['id'], reset_token, expires_at))
            conn.commit()
            
            # Send reset email
            if send_reset_email(email, reset_token):
                flash('Password reset link has been sent to your email')
            else:
                flash('Error sending email. Please try again later')
        else:
            # Don't reveal if email exists or not for security
            flash('If an account with this email exists, a password reset link has been sent')
        
        cursor.close()
        conn.close()
        
        return render_template('forgot_password.html')
    
    return render_template('forgot_password.html')

# Route for password reset page
@app.route('/reset_password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    if 'user_id' in session:
        return redirect(url_for('welcome'))
    
    try:
        # Verify token (expires in 1 hour)
        email = serializer.loads(token, salt='password-reset-salt', max_age=3600)
    except:
        flash('Invalid or expired reset link')
        return redirect(url_for('forgot_password'))
    
    # Check if token exists and is not used
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT prt.*, u.email FROM password_reset_tokens prt
        JOIN users u ON prt.user_id = u.id
        WHERE prt.token = %s AND prt.used = FALSE AND prt.expires_at > %s
    ''', (token, datetime.now()))
    
    token_record = cursor.fetchone()
    
    if not token_record:
        cursor.close()
        conn.close()
        flash('Invalid or expired reset link')
        return redirect(url_for('forgot_password'))
    
    if request.method == 'POST':
        new_password = request.form['password']
        confirm_password = request.form['confirm_password']
        
        if not new_password or not confirm_password:
            flash('Please fill in all fields')
            return render_template('reset_password.html', token=token)
        
        if new_password != confirm_password:
            flash('Passwords do not match')
            return render_template('reset_password.html', token=token)
        
        if len(new_password) < 6:
            flash('Password must be at least 6 characters long')
            return render_template('reset_password.html', token=token)
        
        # Update user password
        hashed_password = generate_password_hash(new_password)
        
        cursor.execute('''
            UPDATE users SET password = %s WHERE email = %s
        ''', (hashed_password, email))
        
        # Mark token as used
        cursor.execute('''
            UPDATE password_reset_tokens SET used = TRUE WHERE token = %s
        ''', (token,))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        flash('Password has been reset successfully. You can now login with your new password.')
        return redirect(url_for('login'))
    
    cursor.close()
    conn.close()
    
    return render_template('reset_password.html', token=token)

# Function for get relevant songs from the database based on user's language preferences
def get_songs_for_emotion(emotion, user_id=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if user_id:
        # Get user's language preferences
        cursor.execute('SELECT language FROM user_language_preferences WHERE user_id = %s', (user_id,))
        user_languages = [row['language'] for row in cursor.fetchall()]
        
        if user_languages:
            # Get songs that match the emotion and user's preferred languages
            placeholders = ','.join(['%s'] * len(user_languages))
            query = f'SELECT * FROM songs WHERE emotion = %s AND language IN ({placeholders})'
            params = [emotion] + user_languages
            cursor.execute(query, params)
        else:
            # If no language preferences, get all songs for the emotion
            cursor.execute('SELECT * FROM songs WHERE emotion = %s', (emotion,))
    else:
        # If no user_id provided, get all songs for the emotion
        cursor.execute('SELECT * FROM songs WHERE emotion = %s', (emotion,))
    
    songs = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    # Convert to the format expected by the frontend
    return [{
        'title': song['title'],
        'artist': song['artist'],
        'url': song['url'],
        'language': song['language']
    } for song in songs]

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
    try:
        if model is None:
            load_model()
            if model is None:
                raise Exception("Model failed to load")

        # Convert image to OpenCV format
        if isinstance(image, str):  # Base64 string
            image_data = base64.b64decode(image.split(',')[1])
            image = Image.open(io.BytesIO(image_data))
            
        if isinstance(image, Image.Image):
            opencv_img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        else:
            opencv_img = image

        display_img = opencv_img.copy()
        gray = cv2.cvtColor(opencv_img, cv2.COLOR_BGR2GRAY)
        
        # Load face cascade
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)

        if len(faces) == 0:
            return display_img, [], "No faces detected"

        results = []
        for (x, y, w, h) in faces:
            face_roi = gray[y:y+h, x:x+w]
            face_roi = cv2.resize(face_roi, (48, 48))
            face_roi = face_roi.astype("float") / 255.0
            face_roi = np.expand_dims(face_roi, axis=0)
            face_roi = np.expand_dims(face_roi, axis=-1)

            prediction = model.predict(face_roi)
            emotion_labels = ['Angry', 'Disgust', 'Fear', 'Happy', 'Neutral', 'Sad', 'Surprise']
            emotion = emotion_labels[np.argmax(prediction)]
            probability = float(np.max(prediction))

            # Draw on image
            emotion_colors = {
                "Angry": (0, 0, 255),
                "Disgust": (0, 128, 128),
                "Fear": (128, 0, 128),
                "Happy": (0, 255, 255),
                "Neutral": (128, 128, 128),
                "Sad": (255, 0, 0),
                "Surprise": (0, 165, 255)
            }
            color = emotion_colors.get(emotion, (0, 255, 0))
            cv2.rectangle(display_img, (x, y), (x+w, y+h), color, 2)
            cv2.putText(display_img, f"{emotion}: {probability:.2f}", 
                        (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, 
                        color, 2)

            results.append({
                'emotion': emotion,
                'probability': probability,
                'position': (x, y, w, h)
            })

        dominant_emotion = max(results, key=lambda x: x['probability'])['emotion'] if results else None
        return display_img, results, dominant_emotion

    except Exception as e:
        print(f"Error in detect_emotion: {str(e)}")
        return None, [], str(e)

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
    
    # Return the dominant emotion and song recommendations
    return {
        "dominant_emotion": dominant_emotion,
        "recommendations": emotion_songs.get(dominant_emotion, [])
    }

# Save user emotion and recommendation history
def save_user_history(user_id, emotion, song_id=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    history_id = str(uuid.uuid4())
    
    cursor.execute('INSERT INTO user_history (id, user_id, emotion, song_id) VALUES (%s, %s, %s, %s)',
                 (history_id, user_id, emotion, song_id))
    
    conn.commit()
    cursor.close()
    conn.close()

# Helper function to get user's language preferences
def get_user_language_preferences(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT language FROM user_language_preferences WHERE user_id = %s', (user_id,))
    languages = [row['language'] for row in cursor.fetchall()]
    
    cursor.close()
    conn.close()
    
    return languages

# Helper function to save user's language preferences
def save_user_language_preferences(user_id, languages):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Delete existing preferences
    cursor.execute('DELETE FROM user_language_preferences WHERE user_id = %s', (user_id,))
    
    # Insert new preferences
    for language in languages:
        pref_id = str(uuid.uuid4())
        cursor.execute('''
            INSERT INTO user_language_preferences (id, user_id, language)
            VALUES (%s, %s, %s)
        ''', (pref_id, user_id, language))
    
    conn.commit()
    cursor.close()
    conn.close()

# Admin functions
def get_dashboard_statistics():
    """Get comprehensive dashboard statistics"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get total users count
        cursor.execute('SELECT COUNT(*) FROM users')
        user_count = cursor.fetchone()[0]
        
        # Get total songs count
        cursor.execute('SELECT COUNT(*) FROM songs')
        song_count = cursor.fetchone()[0]
        
        # Get total emotion detections count
        cursor.execute('SELECT COUNT(*) FROM user_history')
        detection_count = cursor.fetchone()[0]
        
        # Get active sessions (users who had activity in last 24 hours)
        cursor.execute('''
            SELECT COUNT(DISTINCT user_id) FROM user_history 
            WHERE timestamp > NOW() - INTERVAL '24 hours'
        ''')
        active_sessions = cursor.fetchone()[0]
        
        # Get emotion distribution
        cursor.execute('''
            SELECT emotion, COUNT(*) as count 
            FROM user_history 
            GROUP BY emotion 
            ORDER BY count DESC
        ''')
        emotion_distribution = cursor.fetchall()
        
        # Get daily activity for last 7 days
        cursor.execute('''
            SELECT DATE(timestamp) as date, COUNT(*) as count
            FROM user_history 
            WHERE timestamp > NOW() - INTERVAL '7 days'
            GROUP BY DATE(timestamp)
            ORDER BY date
        ''')
        daily_activity = cursor.fetchall()
        
        # Get language preferences distribution
        cursor.execute('''
            SELECT language, COUNT(*) as count
            FROM user_language_preferences
            GROUP BY language
            ORDER BY count DESC
        ''')
        language_distribution = cursor.fetchall()
        
        # Get recent activity (last 10 activities)
        cursor.execute('''
            SELECT uh.emotion, uh.timestamp, u.name, s.title, s.artist
            FROM user_history uh
            JOIN users u ON uh.user_id = u.id
            LEFT JOIN songs s ON uh.song_id = s.id
            ORDER BY uh.timestamp DESC
            LIMIT 10
        ''')
        recent_activity = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return {
            'user_count': user_count,
            'song_count': song_count,
            'detection_count': detection_count,
            'active_sessions': active_sessions,
            'emotion_distribution': [dict(row) for row in emotion_distribution],
            'daily_activity': [dict(row) for row in daily_activity],
            'language_distribution': [dict(row) for row in language_distribution],
            'recent_activity': [dict(row) for row in recent_activity]
        }
        
    except Exception as e:
        print(f"Error getting dashboard statistics: {e}")
        cursor.close()
        conn.close()
        return {
            'user_count': 0,
            'song_count': 0,
            'detection_count': 0,
            'active_sessions': 0,
            'emotion_distribution': [],
            'daily_activity': [],
            'language_distribution': [],
            'recent_activity': []
        }

# Authentication Routes
@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('welcome'))
    return redirect(url_for('login'))

# Language selection route
@app.route('/language_selection')
@login_required
def language_selection():
    return render_template('language.html')

# Save language preferences route
@app.route('/save_language_preferences', methods=['POST'])
@login_required
def save_language_preferences():
    data = request.json
    languages = data.get('languages', [])
    
    if not languages:
        return jsonify({"success": False, "error": "Please select at least one language"}), 400
    
    try:
        save_user_language_preferences(session['user_id'], languages)
        return jsonify({"success": True, "redirect_url": url_for('welcome')})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Admin Routes
@app.route('/admin')
@login_required
def admin_dashboard():
    # Check if user is admin
    if not session.get('is_admin', False):
        flash('You do not have permission to access this page')
        return redirect(url_for('welcome'))
    
    # Get dashboard statistics
    stats = get_dashboard_statistics()
    
    return render_template('admin/dashboard.html', **stats)

# Add new API endpoint for real-time dashboard updates
@app.route('/admin/get_dashboard_stats')
@login_required
def get_dashboard_stats():
    # Check if user is admin
    if not session.get('is_admin', False):
        return jsonify({"success": False, "error": "Unauthorized"}), 403
    
    try:
        stats = get_dashboard_statistics()
        return jsonify({
            "success": True,
            **stats
        })
    except Exception as e:
        print(f"Error getting dashboard stats: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# Add route for emotion analytics
@app.route('/admin/emotion_analytics')
@login_required
def admin_emotion_analytics():
    if not session.get('is_admin', False):
        return jsonify({"success": False, "error": "Unauthorized"}), 403
    
    period = request.args.get('period', '7')  # 7, 30, or 90 days
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT emotion, COUNT(*) as count 
            FROM user_history 
            WHERE timestamp > NOW() - INTERVAL '%s days'
            GROUP BY emotion 
            ORDER BY count DESC
        ''', (period,))
        
        emotion_data = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify({
            "success": True,
            "data": [dict(row) for row in emotion_data]
        })
        
    except Exception as e:
        cursor.close()
        conn.close()
        return jsonify({"success": False, "error": str(e)}), 500

# Add route for activity analytics
@app.route('/admin/activity_analytics')
@login_required
def admin_activity_analytics():
    if not session.get('is_admin', False):
        return jsonify({"success": False, "error": "Unauthorized"}), 403
    
    period = request.args.get('period', '7')  # 7 or 30 days
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        if period == '7':
            # Daily data for last 7 days
            cursor.execute('''
                SELECT DATE(timestamp) as date, COUNT(*) as detections,
                       COUNT(DISTINCT user_id) as users
                FROM user_history 
                WHERE timestamp > NOW() - INTERVAL '7 days'
                GROUP BY DATE(timestamp)
                ORDER BY date
            ''')
        else:
            # Weekly data for last 30 days
            cursor.execute('''
                SELECT DATE_TRUNC('week', timestamp) as week, COUNT(*) as detections,
                       COUNT(DISTINCT user_id) as users
                FROM user_history 
                WHERE timestamp > NOW() - INTERVAL '30 days'
                GROUP BY DATE_TRUNC('week', timestamp)
                ORDER BY week
            ''')
        
        activity_data = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify({
            "success": True,
            "data": [dict(row) for row in activity_data]
        })
        
    except Exception as e:
        cursor.close()
        conn.close()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/admin/songs')
@login_required
def admin_songs():
    # Check if user is admin
    if not session.get('is_admin', False):
        flash('You do not have permission to access this page')
        return redirect(url_for('welcome'))
    
    # Get all songs grouped by emotion
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT DISTINCT emotion FROM songs ORDER BY emotion')
    emotions = [row['emotion'] for row in cursor.fetchall()]
    
    songs_by_emotion = {}
    for emotion in emotions:
        cursor.execute('SELECT * FROM songs WHERE emotion = %s ORDER BY title', (emotion,))
        songs_by_emotion[emotion] = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return render_template('admin/songs.html', songs_by_emotion=songs_by_emotion)

@app.route('/admin/add_song', methods=['POST'])
@login_required
def admin_add_song():
    try:
        # Check admin authorization
        if not session.get('is_admin', False):
            return jsonify({"success": False, "error": "Unauthorized"}), 403
        
        # Check if request contains JSON data
        if not request.is_json:
            return jsonify({"success": False, "error": "Request must be JSON"}), 400
        
        data = request.get_json()
        
        # Check if data was parsed successfully
        if data is None:
            return jsonify({"success": False, "error": "Invalid JSON data"}), 400
        
        # Extract and validate data
        title = data.get('title', '').strip()
        artist = data.get('artist', '').strip()
        url = data.get('url', '').strip()
        emotion = data.get('emotion', '').strip()
        language = data.get('language', '').strip()
        
        # Validate all fields are present and not empty
        if not all([title, artist, url, emotion, language]):
            missing_fields = []
            if not title: missing_fields.append('title')
            if not artist: missing_fields.append('artist')
            if not url: missing_fields.append('url')
            if not emotion: missing_fields.append('emotion')
            if not language: missing_fields.append('language')
            
            return jsonify({
                "success": False, 
                "error": f"Missing required fields: {', '.join(missing_fields)}"
            }), 400
        
        # Validate URL format (basic check)
        if not (url.startswith('http://') or url.startswith('https://')):
            return jsonify({"success": False, "error": "Invalid URL format"}), 400
        
        # Validate emotion is from allowed list
        allowed_emotions = [
            'Angry', 'Disgust', 'Fear', 'Happy', 'Neutral', 'Sad', 'Surprise',
            'Pregnant', 'Depression', 'Trouble Sleeping', 'Travelling', 
            'Stressed', 'Lonely', 'Excited'
        ]
        if emotion not in allowed_emotions:
            return jsonify({"success": False, "error": "Invalid emotion"}), 400
        
        # Validate language is from allowed list
        allowed_languages = ['English', 'Sinhala', 'Hindi', 'Tamil', 'Korean', 'Other']
        if language not in allowed_languages:
            return jsonify({"success": False, "error": "Invalid language"}), 400
        
        # Database operations
        conn = None
        cursor = None
        
        try:
            conn = get_db_connection()
            if conn is None:
                return jsonify({"success": False, "error": "Database connection failed"}), 500
            
            cursor = conn.cursor()
            
            # Check if song already exists (optional - prevent duplicates)
            cursor.execute('''
                SELECT COUNT(*) FROM songs 
                WHERE title = %s AND artist = %s AND url = %s
            ''', (title, artist, url))
            
            if cursor.fetchone()[0] > 0:
                return jsonify({
                    "success": False, 
                    "error": "Song with same title, artist, and URL already exists"
                }), 400
            
            # Generate unique ID
            song_id = str(uuid.uuid4())
            
            # Insert new song
            cursor.execute('''
                INSERT INTO songs (id, title, artist, url, emotion, language)
                VALUES (%s, %s, %s, %s, %s, %s)
            ''', (song_id, title, artist, url, emotion, language))
            
            # Check if insertion was successful
            if cursor.rowcount == 0:
                return jsonify({"success": False, "error": "Failed to insert song"}), 500
            
            conn.commit()
            
            return jsonify({
                "success": True, 
                "song_id": song_id,
                "message": "Song added successfully"
            }), 201
            
        except Exception as db_error:
            if conn:
                conn.rollback()
            
            # Log the error for debugging
            print(f"Database error in admin_add_song: {str(db_error)}")
            
            # Check for specific database errors
            error_message = str(db_error)
            if "Duplicate entry" in error_message:
                return jsonify({"success": False, "error": "Song already exists"}), 400
            elif "doesn't exist" in error_message:
                return jsonify({"success": False, "error": "Database table not found"}), 500
            else:
                return jsonify({"success": False, "error": f"Database error: {error_message}"}), 500
                
        finally:
            # Clean up database connections
            if cursor:
                cursor.close()
            if conn:
                conn.close()
                
    except Exception as e:
        # Log the error for debugging
        print(f"General error in admin_add_song: {str(e)}")
        return jsonify({"success": False, "error": f"Server error: {str(e)}"}), 500

@app.route('/admin/delete_song/<song_id>', methods=['DELETE'])
@login_required
def admin_delete_song(song_id):
    if not session.get('is_admin', False):
        return jsonify({"success": False, "error": "Unauthorized"}), 403
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('DELETE FROM songs WHERE id = %s', (song_id,))
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'user_id' in session:
        if session.get('is_admin', False):
            return redirect(url_for('admin_dashboard'))
        return redirect(url_for('welcome'))
        
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if the user exists (by username or email)
        cursor.execute('SELECT * FROM users WHERE username = %s OR email = %s', 
                      (username, username))
        user = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if user and check_password_hash(user['password'], password):
            # Set session variables
            session.clear()
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['name'] = user['name']
            session['is_admin'] = user['is_admin']
            session['email'] = user['email']
            
            # Redirect based on admin status
            if user['is_admin']:
                return redirect(url_for('admin_dashboard'))
            
            # Directly redirect to welcome page (no language check)
            return redirect(url_for('welcome'))
        
        flash('Invalid username or password')
    
    return render_template('login.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if 'user_id' in session:
        return redirect(url_for('welcome'))
        
    if request.method == 'POST':
        name = request.form['name']
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']
        confirm_password = request.form['confirm_password']
        
        # Validate input
        if not all([name, username, email, password, confirm_password]):
            flash('All fields are required')
            return render_template('signup.html')
            
        if password != confirm_password:
            flash('Passwords do not match')
            return render_template('signup.html')
        
        # Check if username or email already exists
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users WHERE username = %s OR email = %s', 
                      (username, email))
        existing_user = cursor.fetchone()
        
        if existing_user:
            cursor.close()
            conn.close()
            flash('Username or email already exists')
            return render_template('signup.html')
        
        # Create new user (non-admin by default)
        user_id = str(uuid.uuid4())
        hashed_password = generate_password_hash(password)
        
        try:
            cursor.execute('''
                INSERT INTO users (id, name, username, email, password, is_admin)
                VALUES (%s, %s, %s, %s, %s, FALSE)
            ''', (user_id, name, username, email, hashed_password))
            conn.commit()
            
            # Log the user in
            session.clear()
            session['user_id'] = user_id
            session['username'] = username
            session['name'] = name
            session['email'] = email
            session['is_admin'] = False
            
            cursor.close()
            conn.close()
            
            # Always redirect to language selection for new users
            return redirect(url_for('language_selection'))
            
        except Exception as e:
            conn.rollback()
            cursor.close()
            conn.close()
            flash(f'An error occurred during registration: {str(e)}')
            return render_template('signup.html')
    
    return render_template('signup.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# Profile page route
@app.route('/profile')
@login_required
def profile():
    try:
        # Get user data from database
        user_data = get_user_by_id(session['user_id'])
        
        if not user_data:
            flash('User not found')
            return redirect(url_for('welcome'))
        
        # Get user statistics
        stats = get_user_statistics(session['user_id'])
        
        # Get language preferences
        languages = get_user_language_preferences(session['user_id'])
        
        # Combine all data for template
        profile_data = {
            'id': user_data.get('id'),
            'name': user_data.get('name'),
            'username': user_data.get('username'),
            'email': user_data.get('email'),
            'avatar_data': user_data.get('avatar_data'),
            'created_at': user_data.get('created_at'),
            'is_admin': user_data.get('is_admin', False),
            'preferred_languages': ','.join(languages) if languages else '',
            'language_preferences': languages,
            'emotion_detections_count': stats.get('emotion_detections_count', 0),
            'songs_played_count': stats.get('songs_played_count', 0),
            'unique_emotions_count': stats.get('unique_emotions_count', 0),
            'total_sessions': 0  # You can implement session tracking later
        }
        
        return render_template('profile.html', user=profile_data)
        
    except Exception as e:
        print(f"Error in profile route: {e}")
        flash('An error occurred while loading your profile')
        return redirect(url_for('welcome'))

# Settings page route
@app.route('/settings')
@login_required
def settings():
    try:
        user_data = get_user_by_id(session['user_id'])
        
        if not user_data:
            flash('User not found')
            return redirect(url_for('welcome'))
        
        languages = get_user_language_preferences(session['user_id'])
        
        # Combine data for template
        settings_data = {
            'id': user_data.get('id'),
            'name': user_data.get('name'),
            'username': user_data.get('username'),
            'email': user_data.get('email'),
            'avatar_data': user_data.get('avatar_data'),
            'created_at': user_data.get('created_at'),
            'is_admin': user_data.get('is_admin', False),
            'language_preferences': languages
        }
        
        return render_template('settings.html', user=settings_data)
        
    except Exception as e:
        print(f"Error in settings route: {e}")
        flash('An error occurred while loading settings')
        return redirect(url_for('welcome'))

# Update profile route
@app.route('/update_profile', methods=['POST'])
@login_required
def update_profile():
    try:
        data = request.get_json()
        name = data.get('name', '').strip()
        email = data.get('email', '').strip()
        
        if not name or not email:
            return jsonify({'success': False, 'error': 'Name and email are required'})
        
        # Validate email format
        if not is_valid_email(email):
            return jsonify({'success': False, 'error': 'Invalid email format'})
        
        # Check if email is already taken by another user
        existing_user = get_user_by_email(email)
        if existing_user and existing_user['id'] != session['user_id']:
            return jsonify({'success': False, 'error': 'Email already in use'})
        
        # Update user in database
        success = update_user_profile(session['user_id'], name, email)
        
        if success:
            # Update session
            session['name'] = name
            session['email'] = email
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'Failed to update profile'})
            
    except Exception as e:
        print(f"Error updating profile: {e}")
        return jsonify({'success': False, 'error': 'An error occurred'})

# Update password route
@app.route('/update_password', methods=['POST'])
@login_required
def update_password():
    try:
        data = request.get_json()
        current_password = data.get('current_password', '')
        new_password = data.get('new_password', '')
        
        if not current_password or not new_password:
            return jsonify({'success': False, 'error': 'Both passwords are required'})
        
        # Get user data
        user_data = get_user_by_id(session['user_id'])
        
        # Get password from database
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT password FROM users WHERE id = %s', (session['user_id'],))
        user_password = cursor.fetchone()['password']
        cursor.close()
        conn.close()
        
        # Verify current password
        if not check_password_hash(user_password, current_password):
            return jsonify({'success': False, 'error': 'Current password is incorrect'})
        
        # Validate new password strength
        if len(new_password) < 8:
            return jsonify({'success': False, 'error': 'Password must be at least 8 characters long'})
        
        # Hash new password
        hashed_password = generate_password_hash(new_password)
        
        # Update password in database
        success = update_user_password(session['user_id'], hashed_password)
        
        if success:
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'Failed to update password'})
            
    except Exception as e:
        print(f"Error updating password: {e}")
        return jsonify({'success': False, 'error': 'An error occurred'})

# Update language preferences route
@app.route('/update_language_preferences', methods=['POST'])
@login_required
def update_language_preferences():
    try:
        data = request.get_json()
        languages = data.get('languages', [])
        
        if not languages:
            return jsonify({'success': False, 'error': 'At least one language must be selected'})
        
        # Update in database
        save_user_language_preferences(session['user_id'], languages)
        
        return jsonify({'success': True})
            
    except Exception as e:
        print(f"Error updating language preferences: {e}")
        return jsonify({'success': False, 'error': 'An error occurred'})

# Get language preferences route
@app.route('/get_language_preferences')
@login_required
def get_language_preferences():
    try:
        languages = get_user_language_preferences(session['user_id'])
        return jsonify({'success': True, 'languages': languages})
        
    except Exception as e:
        print(f"Error getting language preferences: {e}")
        return jsonify({'success': False, 'error': 'An error occurred'})

# Update profile picture route
@app.route('/update_profile_picture', methods=['POST'])
@login_required
def update_profile_picture():
    try:
        data = request.get_json()
        image_data = data.get('image', '')
        
        if not image_data:
            return jsonify({'success': False, 'error': 'No image data provided'})
        
        # Extract base64 data
        if 'data:image' in image_data:
            image_data = image_data.split(',')[1]
        
        # Save image data in database
        success = update_user_avatar(session['user_id'], image_data)
        
        if success:
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'Failed to update profile picture'})
            
    except Exception as e:
        print(f"Error updating profile picture: {e}")
        return jsonify({'success': False, 'error': 'An error occurred'})

# Get user activity route
@app.route('/get_user_activity')
@login_required
def get_user_activity():
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 5))
        
        activities = get_user_activity_data(session['user_id'], page, limit)
        has_more = len(activities) == limit
        
        return jsonify({
            'success': True, 
            'activities': activities,
            'has_more': has_more
        })
        
    except Exception as e:
        print(f"Error getting user activity: {e}")
        return jsonify({'success': False, 'error': 'An error occurred'})

# Download user data route
@app.route('/download_user_data')
@login_required
def download_user_data():
    try:
        # Get all user data
        user_data = get_complete_user_data(session['user_id'])
        
        # Create JSON file
        json_data = json.dumps(user_data, indent=2, default=str)
        
        # Create file-like object
        file_obj = io.StringIO(json_data)
        file_obj.seek(0)
        
        # Convert to bytes
        bytes_obj = io.BytesIO(file_obj.getvalue().encode('utf-8'))
        bytes_obj.seek(0)
        
        return send_file(
            bytes_obj,
            as_attachment=True,
            download_name='moodify_user_data.json',
            mimetype='application/json'
        )
        
    except Exception as e:
        print(f"Error downloading user data: {e}")
        return jsonify({'success': False, 'error': 'An error occurred'})

# Clear activity history route
@app.route('/clear_activity_history', methods=['POST'])
@login_required
def clear_activity_history():
    try:
        success = clear_user_activity_history(session['user_id'])
        
        if success:
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'Failed to clear activity history'})
            
    except Exception as e:
        print(f"Error clearing activity history: {e}")
        return jsonify({'success': False, 'error': 'An error occurred'})

# Delete account route
@app.route('/delete_account', methods=['POST'])
@login_required
def delete_account():
    try:
        success = delete_user_account(session['user_id'])
        
        if success:
            # Clear session
            session.clear()
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'Failed to delete account'})
            
    except Exception as e:
        print(f"Error deleting account: {e}")
        return jsonify({'success': False, 'error': 'An error occurred'})

# Application Routes
@app.route('/welcome')
@login_required
def welcome():
    return render_template('welcome.html', username=session.get('name', 'User'))

@app.route('/detect')
@login_required
def detect():
    return render_template('detect.html')

@app.route('/recommendations')
@login_required
def recommendations():
    return render_template('recommendations.html')

@app.route('/video_feed')
@login_required
def video_feed():
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/process_emotion', methods=['POST'])
@login_required
def process_emotion():
    try:
        data = request.json
        if not data or 'image' not in data:
            return jsonify({"error": "No image data provided"}), 400

        # Get the base64 image data
        image_data = data['image']
        
        # Remove the data URL prefix if present
        if image_data.startswith('data:image'):
            image_data = image_data.split(',')[1]

        try:
            # Decode the base64 image
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
            
            # Convert to OpenCV format
            opencv_img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # Process the image
            display_img, predictions, dominant_emotion = detect_emotion(opencv_img)
            
            if not dominant_emotion:
                return jsonify({"error": "No faces detected or emotion recognized"}), 400

            # Save to history
            save_user_history(session['user_id'], dominant_emotion)
            
            # Get recommendations based on user's language preferences
            recommendations = get_songs_for_emotion(dominant_emotion, session['user_id'])
            
            return jsonify({
                "dominant_emotion": dominant_emotion,
                "recommendations": recommendations
            })
            
        except Exception as e:
            print(f"Error processing image: {str(e)}")
            return jsonify({"error": "Failed to process image"}), 500

    except Exception as e:
        print(f"Error in process_emotion: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

# Add this new route for getting songs by emotion with language filtering
@app.route('/get_songs/<emotion>')
@login_required
def get_songs(emotion):
    songs = get_songs_for_emotion(emotion, session['user_id'])
    return jsonify(songs)

@app.route('/save_song_selection', methods=['POST'])
@login_required
def save_song_selection():
    data = request.json
    emotion = data.get('emotion')
    song_id = data.get('song_id')
    
    if 'user_id' in session:
        save_user_history(session['user_id'], emotion, song_id)
        return jsonify({"success": True})
    
    return jsonify({"success": False, "error": "User not logged in"})

@app.route('/user_history')
@login_required
def user_history():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT emotion, song_id, timestamp 
        FROM user_history 
        WHERE user_id = %s 
        ORDER BY timestamp DESC
    ''', (session['user_id'],))
    
    history = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return render_template('history.html', history=history)

if __name__ == '__main__':
    # Initialize the database on startup
    try:
        init_db()
        print("Database initialized successfully")
    except Exception as e:
        print(f"Error initializing database: {str(e)}")
    
    # Load emotion detection model
    load_model()
    
    # Get port from environment variable (for Render deployment)
    port = int(os.environ.get('PORT', 5000))
    
    # Run the Flask app
    app.run(debug=False, host='0.0.0.0', port=port)