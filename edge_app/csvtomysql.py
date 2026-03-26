import csv
import mysql.connector
from mysql.connector import Error

# ---------------- CONFIG ----------------
DB_HOST = 'localhost'
DB_USER = 'root'
DB_PASSWORD = ''
DB_NAME = 'recycle_db1'

USER_CSV = '/Users/saikatdas/Desktop/IOT Project/New/MIne/userinfo.csv'
WASTE_CSV = '/Users/saikatdas/Desktop/IOT Project/New/MIne/wastelist.csv'

# ---------------- CONNECT TO MYSQL ----------------
try:
    conn = mysql.connector.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME
    )
    if conn.is_connected():
        print("Connected to MySQL database")
except Error as e:
    print("Error connecting to MySQL:", e)
    exit(1)

cursor = conn.cursor()

# ---------------- CREATE TABLES IF NOT EXIST ----------------
cursor.execute("""
CREATE TABLE IF NOT EXISTS userinfo (
    VoterID VARCHAR(50) PRIMARY KEY,
    Name VARCHAR(100),
    FingerID INT,
    Timestamp VARCHAR(50)
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS wastelist (
    DateTime VARCHAR(50),
    BinID VARCHAR(50),
    VoterID VARCHAR(50),
    Name VARCHAR(100),
    ClassifiedWaste VARCHAR(50)
)
""")

# ---------------- FUNCTION TO IMPORT CSV ----------------
def import_csv_to_mysql(csv_path, table_name):
    with open(csv_path, newline='') as file:
        reader = csv.DictReader(file)
        rows = list(reader)

    if not rows:
        print(f"No data found in {csv_path}")
        return

    placeholders = ', '.join(['%s'] * len(rows[0]))
    columns = ', '.join(rows[0].keys())
    sql = f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders})"

    # Use IGNORE to avoid duplicate primary key errors
    for row in rows:
        try:
            cursor.execute(sql, list(row.values()))
        except mysql.connector.IntegrityError:
            # Skip duplicates
            pass

    conn.commit()
    print(f"✅ Imported {len(rows)} rows into {table_name}")

# ---------------- RUN IMPORT ----------------
import_csv_to_mysql(USER_CSV, 'userinfo')
import_csv_to_mysql(WASTE_CSV, 'wastelist')

# ---------------- CLOSE CONNECTION ----------------
cursor.close()
conn.close()