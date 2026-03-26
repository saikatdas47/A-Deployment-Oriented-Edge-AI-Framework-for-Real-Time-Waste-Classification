#!/usr/bin/env python3
import csv, json, hashlib, os, time
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend

# === Directories ===
KEY_DIR = "/Users/saikatdas/Desktop/IOT Project/New/MIne/BlockChain"
CSV_DIR = "/Users/saikatdas/Desktop/IOT Project/New/MIne"
CHAIN_DIR = os.path.join(KEY_DIR, "Blockchain")

# Make sure blockchain folder exists
os.makedirs(CHAIN_DIR, exist_ok=True)

# === Load Keys ===
with open(os.path.join(KEY_DIR, "blockchain_private.pem"), "rb") as f:
    PRIVATE_KEY = serialization.load_pem_private_key(f.read(), password=None, backend=default_backend())

with open(os.path.join(KEY_DIR, "blockchain_public.pem"), "rb") as f:
    PUBLIC_KEY = serialization.load_pem_public_key(f.read(), backend=default_backend())

# === Blockchain Helpers ===
def hash_block(block):
    block_copy = dict(block)
    block_copy.pop("hash", None)
    block_copy.pop("signature", None)
    return hashlib.sha256(json.dumps(block_copy, sort_keys=True).encode()).hexdigest()

def sign_data(data_hash):
    signature = PRIVATE_KEY.sign(
        data_hash.encode(),
        padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH),
        hashes.SHA256()
    )
    return signature.hex()

def verify_signature(data_hash, signature_hex):
    try:
        PUBLIC_KEY.verify(
            bytes.fromhex(signature_hex),
            data_hash.encode(),
            padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH),
            hashes.SHA256()
        )
        return True
    except Exception:
        return False

def load_chain(file):
    if os.path.exists(file):
        with open(file, "r") as f:
            return json.load(f)
    return []

def save_chain(chain, file):
    with open(file, "w") as f:
        json.dump(chain, f, indent=2)

def add_block(data, chain, file, unique_key):
    for b in chain:
        if b["data"].get(unique_key) == data.get(unique_key):
            print(f"⏩ Duplicate found ({unique_key}={data[unique_key]}), skipping...")
            return chain

    prev_hash = chain[-1]["hash"] if chain else "0"
    block = {
        "index": len(chain),
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "data": data,
        "prev_hash": prev_hash
    }
    block["hash"] = hash_block(block)
    block["signature"] = sign_data(block["hash"])

    chain.append(block)
    save_chain(chain, file)
    print(f"✅ Block added to {file} (index {block['index']})")
    return chain

def build_chain_from_csv(csv_file, chain_file, unique_key):
    chain = load_chain(chain_file)
    with open(csv_file, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            chain = add_block(row, chain, chain_file, unique_key)
    return chain

def verify_chain(chain_file):
    chain = load_chain(chain_file)
    for i, block in enumerate(chain):
        recalculated_hash = hash_block(block)
        if recalculated_hash != block["hash"]:
            print(f"❌ Block {i} hash mismatch!")
            return False
        if not verify_signature(block["hash"], block["signature"]):
            print(f"❌ Block {i} signature invalid!")
            return False
        if i > 0 and block["prev_hash"] != chain[i-1]["hash"]:
            print(f"❌ Block {i} prev_hash mismatch!")
            return False
    print(f"✅ {chain_file} blockchain verified successfully.")
    return True

# === Main ===
if __name__ == "__main__":
    build_chain_from_csv(
        os.path.join(CSV_DIR, "userinfo.csv"),
        os.path.join(CHAIN_DIR, "userinfo_chain.json"),
        unique_key="Timestamp"
    )
    build_chain_from_csv(
        os.path.join(CSV_DIR, "wastelist.csv"),
        os.path.join(CHAIN_DIR, "wastelist_chain.json"),
        unique_key="DateTime"
    )

    verify_chain(os.path.join(CHAIN_DIR, "userinfo_chain.json"))
    verify_chain(os.path.join(CHAIN_DIR, "wastelist_chain.json"))