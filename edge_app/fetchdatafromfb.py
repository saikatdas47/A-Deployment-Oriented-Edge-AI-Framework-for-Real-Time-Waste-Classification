import csv
import os
import firebase_admin
from firebase_admin import credentials, firestore

# ---------------- FIREBASE INIT ----------------
SERVICE_ACCOUNT_PATH = "/Users/saikatdas/Desktop/IOT Project/New/MIne/smartbin-983b7-firebase-adminsdk-fbsvc-454acdb690.json"
cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
firebase_admin.initialize_app(cred)
db = firestore.client()

# ---------------- CSV PATHS ----------------
USER_CSV = '/Users/saikatdas/Desktop/IOT Project/New/MIne/userinfo.csv'
WASTE_CSV = '/Users/saikatdas/Desktop/IOT Project/New/MIne/wastelist.csv'

def fetch_firestore_to_csv():
    # Fetch userinfo collection
    user_ref = db.collection("userinfo")
    user_docs = user_ref.stream()
    
    with open(USER_CSV, mode="w", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(["VoterID", "Name", "FingerID", "Timestamp"])
        for doc in user_docs:
            data = doc.to_dict()
            writer.writerow([
                data.get("VoterID", ""),
                data.get("Name", ""),
                data.get("FingerID", ""),
                data.get("Timestamp", "")
            ])
    print(f"✅ Userinfo data saved to {USER_CSV}")

    # Fetch wastelist collection
    waste_ref = db.collection("wastelist")
    waste_docs = waste_ref.stream()
    
    with open(WASTE_CSV, mode="w", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(["DateTime", "BinID", "VoterID", "Name", "ClassifiedWaste"])
        for doc in waste_docs:
            data = doc.to_dict()
            writer.writerow([
                data.get("DateTime", ""),
                data.get("BinID", ""),
                data.get("VoterID", ""),
                data.get("Name", ""),
                data.get("ClassifiedWaste", "")
            ])
    print(f"✅ Wastelist data saved to {WASTE_CSV}")

# ---------------- RUN ----------------
if __name__ == "__main__":
    fetch_firestore_to_csv()