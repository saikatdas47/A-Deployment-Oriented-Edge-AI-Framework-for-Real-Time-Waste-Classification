import serial
import time
import csv
import os
from pyfingerprint.pyfingerprint import PyFingerprint
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime

CSV_PATH = "/home/asus/Downloads/IOT_project/m1fig.csv"
SERVICE_ACCOUNT_PATH = "/home/asus/Downloads/IOT_project/smartbin-983b7-firebase-adminsdk-fbsvc-454acdb690.json"

# ---------------- FIREBASE INIT ----------------
cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
firebase_admin.initialize_app(cred)
db = firestore.client()

def init_fingerprint():
    try:
        f = PyFingerprint('/dev/serial0', 57600, 0xFFFFFFFF, 0x00000000)
        if not f.verifyPassword():
            raise ValueError('Fingerprint sensor password wrong.')
    except Exception as e:
        print('Failed to initialize fingerprint sensor:', e)
        exit(1)
    return f

def enroll_new_fingerprint(f):
    print("Waiting for finger...")
    while not f.readImage():
        pass
    f.convertImage(0x01)
    result = f.searchTemplate()
    position_number = result[0]

    if position_number >= 0:
        print("Fingerprint already exists at position", position_number)
        return None  # duplicate fingerprint

    print("Remove finger...")
    time.sleep(2)
    print("Place the same finger again...")
    while not f.readImage():
        pass

    f.convertImage(0x02)
    if f.compareCharacteristics() == 0:
        print("Fingerprints do not match. Try again.")
        return None

    f.createTemplate()
    position_number = f.storeTemplate()
    print("New fingerprint enrolled at position", position_number)
    return position_number

def save_to_csv(voterid, name, finger_id):
    file_exists = os.path.isfile(CSV_PATH)
    with open(CSV_PATH, mode="a", newline="") as file:
        writer = csv.writer(file)
        if not file_exists:
            writer.writerow(["VoterID", "Name", "FingerID", "Timestamp"])
        writer.writerow([voterid, name, finger_id, datetime.now().strftime("%Y-%m-%d %H:%M:%S")])

def save_to_firestore(voterid, name, finger_id):
    doc_ref = db.collection("userinfo").document(voterid)
    doc_ref.set({
        "VoterID": voterid,
        "Name": name,
        "FingerID": finger_id,
        "Timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }, merge=True)
    print("Data saved to Firestore")

def voter_exists(voterid):
    if not os.path.exists(CSV_PATH):
        return False
    with open(CSV_PATH, mode="r") as file:
        reader = csv.DictReader(file)
        for row in reader:
            if str(row["VoterID"]) == str(voterid):
                return True
    return False

if __name__ == "__main__":
    f = init_fingerprint()
    print("Fingerprint sensor initialized. Ready for enrollment.\n")

    while True:
        voterid = input("Enter Voter ID: ").strip()
        if voter_exists(voterid):
            print("Voter ID already exists. Try again.\n")
            continue

        name = input("Enter Name: ").strip()
        finger_id = enroll_new_fingerprint(f)
        if finger_id is None:
            print("Duplicate or mismatch detected. Try again.\n")
            continue

        save_to_csv(voterid, name, finger_id)
        save_to_firestore(voterid, name, finger_id)
        print("Enrollment complete! Ready for next user.\n")
        time.sleep(1)