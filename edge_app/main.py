#!/usr/bin/env python3
import os, csv, time, requests
from io import BytesIO
from datetime import datetime
import numpy as np
from PIL import Image
import tensorflow as tf
from pyfingerprint.pyfingerprint import PyFingerprint
import RPi.GPIO as GPIO

# ---------------- CONFIGURATION ----------------
MODEL_PATH = '/home/asus/Downloads/IOT_project/best_garbage_model.keras'  # path to trained TensorFlow waste classification model
CLASS_NAMES = ['biological', 'metal', 'paper', 'plastic']  # class labels for waste prediction
IP_WEBCAM_URL = 'http://192.168.0.101:8080/shot.jpg'  # IP webcam endpoint for capturing image
FINGERPRINT_PORT = '/dev/serial0'  # serial port for fingerprint sensor
BAUD_RATE = 57600  # communication speed with fingerprint sensor
M1_CSV = '/home/asus/Downloads/IOT_project/m1fig.csv'  # fingerprint-user mapping file
OUTPUT_CSV = '/home/asus/Downloads/IOT_project/m3info.csv'  # classification log file
ULTRA_CSV = '/home/asus/Downloads/IOT_project/m8ulta.csv'  # ultrasonic sensor log file
WAIT_SEC = 2  # wait time after motor action
BIN_ID = 1  # unique ID for this smart bin

# ---------------- STEPPER MOTOR SETUP ----------------
IN1, IN2, IN3, IN4 = 4, 17, 27, 22  # GPIO pins connected to stepper driver ULN2003
control_pins = [IN1, IN2, IN3, IN4]
GPIO.setmode(GPIO.BCM)
GPIO.setwarnings(False)
for pin in control_pins:
    GPIO.setup(pin, GPIO.OUT)
    GPIO.output(pin, 0)

# ---------------- SERVO SETUP ----------------
servo_pin = 13
GPIO.setup(servo_pin, GPIO.OUT)
pwm = GPIO.PWM(servo_pin, 50)
pwm.start(0)

def set_angle(angle):
    duty = 2.5 + (angle / 18)
    pwm.ChangeDutyCycle(duty)
    time.sleep(0.5)
    pwm.ChangeDutyCycle(0)

def move_left():
    pwm.ChangeDutyCycle(2.5)   # leftmost
    time.sleep(0.5)
    pwm.ChangeDutyCycle(0)

def move_center():
    pwm.ChangeDutyCycle(7.5)   # center
    time.sleep(0.5)
    pwm.ChangeDutyCycle(0)

# ---------------- STEPPER CONTROL ----------------
halfstep_seq = [
    [1,0,0,0],[1,1,0,0],[0,1,0,0],[0,1,1,0],
    [0,0,1,0],[0,0,1,1],[0,0,0,1],[1,0,0,1]
]
STEPS_PER_REV = 4096
angle_to_steps = {
    90: STEPS_PER_REV//4,
    180: STEPS_PER_REV//2,
    270: 3*STEPS_PER_REV//4,
    360: STEPS_PER_REV
}

def rotate_steps(steps, direction=1, delay=0.002):
    step_counter = 0
    for _ in range(steps):
        for pin in range(4):
            GPIO.output(control_pins[pin], halfstep_seq[step_counter][pin])
        step_counter = (step_counter + direction) % 8
        time.sleep(delay)

def rotate_degree(angle, direction=1):
    steps = angle_to_steps.get(abs(angle))
    if steps:
        rotate_steps(steps, direction if angle >= 0 else -direction)

def motor_cycle(angle):
    if angle == 0: return
    forward_dir = 1 if angle >= 0 else -1
    rotate_degree(angle, direction=forward_dir)
    time.sleep(1)

    # --- Servo sequence: Left -> Center -> Left ---
    print("Servo Left...")
    move_left()
    time.sleep(WAIT_SEC)

    print("Servo Center...")
    move_center()
    time.sleep(WAIT_SEC)

    print("Servo Left again...")
    move_left()
    time.sleep(WAIT_SEC)

    # --- Stepper reverse rotation ---
    rotate_degree(angle, direction=-forward_dir)
    log_ultrasonic()  # ultrasonic log after cycle

# ---------------- MODEL LOADING ----------------
print("Loading TensorFlow model...")
model = tf.keras.models.load_model(MODEL_PATH, compile=False)
print("Model loaded.")

def prepare_image(img, target_size=(299, 299)):
    img = img.resize(target_size, Image.Resampling.LANCZOS)
    arr = np.asarray(img, dtype=np.float32)/255.0
    return np.expand_dims(arr, axis=0)

# ---------------- FINGERPRINT AUTH ----------------
def init_fingerprint():
    try:
        f = PyFingerprint(FINGERPRINT_PORT, BAUD_RATE, 0xFFFFFFFF, 0x00000000)
        if not f.verifyPassword():
            raise ValueError("Fingerprint password incorrect")
        return f
    except Exception as e:
        print("Fingerprint init failed:", e)
        exit(1)

def authenticate(f):
    print("Place finger...")
    while not f.readImage():
        time.sleep(0.1)
    f.convertImage(0x01)
    result = f.searchTemplate()
    return result[0] if result[0] != -1 else None

# ---------------- USER LOADING ----------------
def load_users():
    users = {}
    with open(M1_CSV, newline='') as f:
        for row in csv.DictReader(f):
            users[int(row['FingerID'])] = (row['VoterID'], row['Name'])
    return users

# ---------------- WASTE CLASSIFICATION ----------------
def classify_waste():
    try:
        img = Image.open(BytesIO(requests.get(IP_WEBCAM_URL, timeout=3).content)).convert('RGB')
        preds = model.predict(prepare_image(img), verbose=0)
        return CLASS_NAMES[int(np.argmax(preds[0]))]
    except:
        return "unknown"

# ---------------- CSV LOGGING ----------------
def log_to_csv(voterid, name, wastetype):
    if wastetype == "unknown": return
    file_exists = os.path.isfile(OUTPUT_CSV)
    with open(OUTPUT_CSV, "a", newline="") as file:
        writer = csv.writer(file)
        if not file_exists:
            writer.writerow(["DateTime","BinID","VoterID","Name","ClassifiedWaste"])
        writer.writerow([
            datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            BIN_ID, voterid, name, wastetype
        ])

# ---------------- ULTRASONIC SETUP ----------------
TRIG_PIN, ECHO_PIN, BIN_HEIGHT_CM, LEVEL_STEP = 23, 24, 25, 20
GPIO.setup(TRIG_PIN, GPIO.OUT); GPIO.setup(ECHO_PIN, GPIO.IN)
GPIO.output(TRIG_PIN, False); time.sleep(2)

def measure_distance():
    GPIO.output(TRIG_PIN, True); time.sleep(0.00002); GPIO.output(TRIG_PIN, False)
    while GPIO.input(ECHO_PIN) == 0: pulse_start = time.time()
    while GPIO.input(ECHO_PIN) == 1: pulse_end = time.time()
    distance_cm = (pulse_end - pulse_start) * 17150
    return distance_cm

def calculate_fill(distance):
    distance = max(0,min(distance,BIN_HEIGHT_CM))
    fill_percent = (BIN_HEIGHT_CM - distance) / BIN_HEIGHT_CM * 100
    return round(fill_percent/LEVEL_STEP)*LEVEL_STEP

def log_ultrasonic():
    dist = measure_distance()
    level = calculate_fill(dist)
    file_exists = os.path.isfile(ULTRA_CSV)
    with open(ULTRA_CSV,"a",newline="") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(["DateTime","BinID","Distance_cm","Level%"])
        writer.writerow([
            datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            BIN_ID, f"{dist:.1f}", level
        ])

# ---------------- MAIN LOOP ----------------
def main():
    users = load_users()
    f = init_fingerprint()
    while True:
        fid = authenticate(f)
        if fid is None or fid not in users:
            print("Authentication failed"); continue
        voterid, name = users[fid]
        print(f"Authenticated: {name}")
        wastetype = classify_waste()
        print(f"Classified: {wastetype}")
        log_to_csv(voterid, name, wastetype)
        motor_cycle({"paper":180,"metal":90,"biological":0,"plastic":-90}.get(wastetype,0))
        time.sleep(WAIT_SEC)

if __name__ == "__main__":
    try:
        main()
    finally:
        pwm.stop(); GPIO.cleanup()