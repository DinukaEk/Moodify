from tensorflow.keras.models import load_model

model = load_model("emotion_detection_model.h5")
model.summary()