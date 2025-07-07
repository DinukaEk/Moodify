# Moodify 🎧

Automatically generate personalized music playlists based on your current mood. Connects with Spotify, analyzes audio features, and creates mood-specific playlists using your listening history.

## 🚀 Features
- Authenticates with Spotify using OAuth2
- Retrieves user’s listening history and key audio features (e.g. energy, danceability, valence)
- Normalizes and analyzes those attributes to determine mood
- Generates and displays a mood-based Spotify playlist
- Option to play songs directly from the app

## 🧠 Tech Stack
- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Python, Flask, SQLAlchemy
- **Database**: PostgreSQL
- **ML/Analysis**: NumPy, SciPy (for normalization & algorithms)
- **APIs**: Spotify Web API

## ⚙️ Prerequisites
- Python 3.7+
- PostgreSQL
- Spotify Developer account (Client ID & Secret)

## 🛠️ Setup & Installation

1. Clone the repo:
    ```bash
    git clone https://github.com/DinukaEk/Moodify.git
    cd Moodify
    ```

2. Create and activate a virtual environment:
    ```bash
    python3 -m venv env
    source env/bin/activate
    ```

3. Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

4. Set Spotify credentials:
    ```bash
    export SPOTIFY_CLIENT_ID="your_client_id"
    export SPOTIFY_CLIENT_SECRET="your_client_secret"
    ```

5. Initialize the database:
    ```bash
    createdb moodify
    python model.py  # if this script creates tables
    ```

6. Run the server:
    ```bash
    python server.py
    ```

7. Open the app in your browser at `http://localhost:5000`, connect Spotify, and enjoy a mood-based playlist.

## 📂 Project Structure

Moodify/
├── server.py # Flask server and routing
├── model.py # DB models
├── spotify.py # Spotify API wrapper
├── mood.py # Mood analysis and normalization logic
├── views.py # Flask routes and controllers
├── requirements.txt # Python dependencies
├── static/ # CSS, JS, images
└── templates/ # HTML Jinja templates


## ✅ Usage
1. Launch the app and authorize via Spotify.
2. Wait for your listening data to be fetched.
3. Select a mood or let the algorithm choose.
4. View your mood playlist—play, save, explore!

## 🔮 Future Plans
- Improve mood-detection algorithm (adding ML)
- Save users’ previous mood playlists
- UI enhancements (mood images or theme)
- Export playlist to Spotify automatically

## 🧑‍💻 Contributing
Contributions are welcome!
1. Fork the repository  
2. Create a feature branch: `git checkout -b feature/my-feature`  
3. Commit your changes: `git commit -m "Add feature"`  
4. Push it: `git push origin feature/my-feature`  
5. Submit a Pull Request

## 📄 License
This project is available under the [MIT License](./LICENSE)

---

