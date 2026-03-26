#!/usr/bin/env python3
import json
import csv
import os
from collections import defaultdict
from datetime import datetime, timedelta

# === ফাইল ডিরেক্টরি ===
CHAIN_DIR = "/Users/saikatdas/Desktop/IOT Project/New/MIne/BlockChain/Blockchain"
OUTPUT_CSV = os.path.join(CHAIN_DIR, "reward_analysis_smart.csv")
BLOCKCHAIN_FILE = os.path.join(CHAIN_DIR, "wastelist_chain.json")

# === পয়েন্ট ম্যাপ (Rare waste বেশি points) ===
POINTS_MAP = {
    "plastic": 1,
    "organic": 2,
    "glass": 5,
    "metal": 5
}

# === Reward Tier Function ===
def reward_tier(points):
    if points >= 50:
        return "Train Ticket"
    elif points >= 30:
        return "Voucher"
    elif points >= 15:
        return "Gift Card"
    else:
        return "No Reward"

# === Load Blockchain ===
with open(BLOCKCHAIN_FILE, "r") as f:
    chain = json.load(f)

# === User Summary ===
user_summary = defaultdict(lambda: {
    "Name": "",
    "TotalPoints": 0,
    "Plastic": 0,
    "Organic": 0,
    "Glass": 0,
    "Metal": 0,
    "Transactions": 0,
    "Dates": set()
})

for block in chain:
    data = block["data"]
    voter_id = data["VoterID"]
    name = data["Name"]
    waste = data["ClassifiedWaste"].lower()
    timestamp = datetime.strptime(data["DateTime"], "%Y-%m-%d %H:%M:%S")
    date_str = timestamp.date().isoformat()
    
    user_summary[voter_id]["Name"] = name
    user_summary[voter_id]["Transactions"] += 1
    user_summary[voter_id]["TotalPoints"] += POINTS_MAP.get(waste, 0)
    user_summary[voter_id]["Dates"].add(date_str)
    
    if waste == "plastic": user_summary[voter_id]["Plastic"] += 1
    elif waste == "organic": user_summary[voter_id]["Organic"] += 1
    elif waste == "glass": user_summary[voter_id]["Glass"] += 1
    elif waste == "metal": user_summary[voter_id]["Metal"] += 1

# === Daily Bonus: 3+ waste/day => +2 points ===
for voter_id, info in user_summary.items():
    daily_counts = defaultdict(int)
    for block in chain:
        if block["data"]["VoterID"] == voter_id:
            ts = datetime.strptime(block["data"]["DateTime"], "%Y-%m-%d %H:%M:%S")
            daily_counts[ts.date()] += 1
    for day, count in daily_counts.items():
        if count >= 3:
            info["TotalPoints"] += 2  # daily bonus

# === Monthly Streak Bonus: 5+ consecutive days in a month => +5 points ===
for voter_id, info in user_summary.items():
    dates = sorted([datetime.fromisoformat(d).date() for d in info["Dates"]])
    streak = 1
    max_streak = 1
    for i in range(1, len(dates)):
        if (dates[i] - dates[i-1]).days == 1:
            streak += 1
            max_streak = max(max_streak, streak)
        else:
            streak = 1
    if max_streak >= 5:
        info["TotalPoints"] += 5  # streak bonus

# === Leaderboard Sorting ===
sorted_users = sorted(user_summary.items(), key=lambda x: x[1]["TotalPoints"], reverse=True)

# === Write CSV ===
with open(OUTPUT_CSV, "w", newline="") as f:
    writer = csv.writer(f)
    header = ["Rank", "VoterID", "Name", "Transactions", "Plastic", "Organic", "Glass", "Metal", "TotalPoints", "Reward"]
    writer.writerow(header)
    
    rank = 1
    for voter_id, info in sorted_users:
        reward = reward_tier(info["TotalPoints"])
        row = [
            rank,
            voter_id,
            info["Name"],
            info["Transactions"],
            info["Plastic"],
            info["Organic"],
            info["Glass"],
            info["Metal"],
            info["TotalPoints"],
            reward
        ]
        writer.writerow(row)
        rank += 1

print(f"✅ Smart Reward analysis CSV created at {OUTPUT_CSV}")