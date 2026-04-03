# A Deployment-Oriented Edge-AI Framework for Real-Time Waste Classification with Biometric Authentication and Secure Logging

**Keywords:** Smart Waste Management, Edge AI, Internet of Things (IoT), Waste Classification, Transfer Learning, ImageNet, EfficientNetB0, Raspberry Pi, Biometric Authentication

---

## Overview
This project presents a deployment-oriented smart waste bin system that combines edge-based waste classification, biometric user authentication, automated bin control, fill-level monitoring, cloud synchronization, and lightweight tamper-evident secure logging.

The system is designed for real-time operation on resource-constrained hardware such as Raspberry Pi 4B, where both accuracy and efficiency are important.

Unlike many existing works that focus mainly on model accuracy, this project emphasizes **real-world deployment**, including latency, model size, and hardware limitations.

<p align="center">
  <img src="https://github.com/user-attachments/assets/9a897346-813c-42de-867b-96beb79e7989" alt="Project Prototype" width="400"/>
</p>

Youtube: https://youtu.be/jihThDe6G7c?si=Xp2Tkp8r8tdyD5EB

---

## Key Features
- Real-time waste classification on edge device (TensorFlow Lite)
- Fingerprint-based user authentication (FPM10A)
- Automated bin rotation (stepper motor) and lid actuation (servo motor)
- Ultrasonic sensor-based fill-level monitoring
- Firebase-based cloud synchronization for remote tracking
- Lightweight cryptographic ledger for tamper-evident record keeping
- Benchmarking of multiple CNN architectures under edge constraints
- Fully on-device inference (no continuous cloud dependency)

---

## How the System Works
1. User scans fingerprint for authentication  
2. Waste image is captured using IP camera  
3. CNN model performs classification on Raspberry Pi  
4. Bin rotates to the correct category  
5. Lid opens automatically for disposal  
6. Fill level is monitored using ultrasonic sensor  
7. Data is stored locally and synced to Firebase  
8. Each record is secured using hash + digital signature  

---

## Models Evaluated
- EfficientNetB0  
- MobileNetV1  
- MobileNetV3Small  
- NASNetMobile  
- InceptionV3  
- ResNet50  

**Observation:**
- ResNet50 → highest accuracy  
- MobileNetV3Small → best for edge deployment (fast + lightweight)

---

## Edge Deployment Score (EDS)
To fairly compare models for edge deployment, a combined score (EDS) is used instead of only accuracy.

EDS considers:
- Accuracy  
- F1-score  
- Throughput (speed)  
- Model size  
- Load time  
- CPU usage  
- RAM usage  
- Temperature  

This helps identify models that are practical for real-world use on devices like Raspberry Pi.

---

## System Components

### Hardware
- Raspberry Pi 4B
- Fingerprint sensor (FPM10A)
- IP Webcam
- Stepper motor
- Servo motor
- HC-SR04 ultrasonic sensor

### Software
- Python
- TensorFlow / TensorFlow Lite
- Firebase Firestore
- OpenCV
- Flask

---

## Project Structure

```text
smart-waste-bin/
├── docs/              # Paper, diagrams, documentation
├── edge_app/          # Edge inference + hardware control
├── secure_logging/    # Cryptographic logging system
├── web_app/           # Dashboard / user interface
├── training/          # Model training and experiments
├── tflite/            # Converted TFLite models
├── benchmarks/        # Edge performance evaluation
├── README.md
├── LICENSE
└── .gitignore
```
<p align="center">
  <img src="https://github.com/user-attachments/assets/448bc800-569c-4e24-b8ff-bdbaec46fb16" alt="Reward Interface" width="400"/>
  <img width="400" height="" alt="EDS Comparison" src="https://github.com/user-attachments/assets/bb3929b8-ec41-465e-8922-22387cb5e846" />
</p>


Edge Deployment Score comparison across evaluated CNN architectures.
Higher scores indicate better suitability for edge deployment.

```
git clone https://github.com/your-username/smart-waste-bin.git
cd smart-waste-bin

python3 -m venv venv
source venv/bin/activate

pip install -r requirements.txt

cd edge_app
python main.py
```
