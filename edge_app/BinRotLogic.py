import RPi.GPIO as GPIO
import time

# GPIO pins for ULN2003 inputs (BCM numbering)
IN1, IN2, IN3, IN4 = 4, 17, 27, 22
control_pins = [IN1, IN2, IN3, IN4]

GPIO.setmode(GPIO.BCM)
GPIO.setwarnings(False)

# Setup motor pins
for pin in control_pins:
    GPIO.setup(pin, GPIO.OUT)
    GPIO.output(pin, 0)

# Half-step sequence
halfstep_seq = [
    [1,0,0,0],
    [1,1,0,0],
    [0,1,0,0],
    [0,1,1,0],
    [0,0,1,0],
    [0,0,1,1],
    [0,0,0,1],
    [1,0,0,1]
]

STEPS_PER_REV = 4096


angle_to_steps = {
    90: STEPS_PER_REV // 4,
    180: (STEPS_PER_REV // 4) * 2,
    270: (STEPS_PER_REV // 4) * 3,
    360: (STEPS_PER_REV // 4) * 4
}

def rotate_steps(steps, direction=1, delay=0.002):
    step_counter = 0
    for _ in range(steps):
        for pin in range(4):
            GPIO.output(control_pins[pin], halfstep_seq[step_counter][pin])
        step_counter = (step_counter + direction) % 8
        time.sleep(delay)

def rotate_degree(angle, direction=1):
    steps = angle_to_steps.get(angle, None)
    if steps:
        rotate_steps(steps, direction)
    else:
        print("Angle not supported!")

def motor_cycle(angle):
    print(f"Rotating to {angle} degrees...")
    rotate_degree(angle, direction=1)  # forward
    time.sleep(1)                       # wait 1 second
    print("Returning to 0 degrees...")
    rotate_degree(angle, direction=-1)  # back to 0

try:
    print("Motor ready. Starting from 0 degrees (home).")
    while True:
        user_input = input("Enter angle (90/180/270) or 'q' to quit: ").strip()
        if user_input.lower() == 'q':
            break
        if user_input not in ['90','180','270']:
            print("Invalid input! Only 90, 180, 270 allowed.")
            continue
        motor_cycle(int(user_input))

except KeyboardInterrupt:
    print("Program stopped by user")

finally:
    GPIO.cleanup()
