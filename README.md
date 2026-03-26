# A Deployment-Oriented Edge-AI Framework for Real-Time Waste Classification with Biometric Authentication and Secure Logging
Smart Waste Management, Edge AI, Internet of Things (IoT), Waste Classification, Transfer Learning, ImageNet, EfficientNetB0, Raspberry Pi, Biometric Authentication


# Smart Waste Bin: Edge-AI Waste Classification with Biometric Authentication and Secure Logging

## Overview
This project presents a deployment-oriented smart waste bin system that combines edge-based waste classification, biometric user authentication, automated bin control, fill-level monitoring, cloud synchronization, and lightweight tamper-evident secure logging.

The system is designed for real-time operation on resource-constrained hardware such as Raspberry Pi 4B.

## Key Features
- Real-time waste classification on edge device
- Fingerprint-based user authentication
- Automated bin rotation and lid actuation
- Ultrasonic sensor-based fill-level monitoring
- Firebase-based cloud synchronization
- Lightweight cryptographic ledger for tamper-evident record keeping
- Benchmarking of multiple CNN architectures for edge deployment

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

## Project Structure

```text
smart-waste-bin/
├── docs/
├── edge_app/
├── secure_logging/
├── web_app/
├── training/
├── tflite/
├── benchmarks/
├── README.md
├── LICENSE
├── .gitignore
