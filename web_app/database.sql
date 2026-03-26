-- Creating the database with proper character set
CREATE DATABASE IF NOT EXISTS recycle_db5 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE recycle_db5;

-- Creating tables with IF NOT EXISTS to avoid dropping existing data
CREATE TABLE IF NOT EXISTS userinfo (
  VoterID VARCHAR(50) PRIMARY KEY,
  Name VARCHAR(100),
  FingerID VARCHAR(50),
  Timestamp DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wastelist (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  DateTime DATETIME,
  BinID VARCHAR(50),
  VoterID VARCHAR(50),
  Name VARCHAR(100),
  ClassifiedWaste ENUM('organic','plastic','paper','metal','glass') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX(VoterID),
  INDEX(BinID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  VoterID VARCHAR(50) UNIQUE NOT NULL,
  Name VARCHAR(120),
  FingerID VARCHAR(50) NOT NULL,
  role ENUM('ADMIN','USER') NOT NULL DEFAULT 'USER',
  points INT DEFAULT 0,
  join_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (VoterID) REFERENCES userinfo(VoterID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bin_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(120),
  zone VARCHAR(120),
  location VARCHAR(255) NOT NULL,
  location_lat DECIMAL(9,6) NULL,
  location_lng DECIMAL(9,6) NULL,
  status ENUM('OK','NEAR_FULL','FULL','OFFLINE') DEFAULT 'OK',
  fill_percent TINYINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS disposals (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  bin_id INT NOT NULL,
  waste_type ENUM('organic','plastic','paper','metal','glass') NOT NULL,
  volume_liters DECIMAL(6,2) NULL,
  confidence DECIMAL(5,2) NULL,
  points INT NOT NULL DEFAULT 0,
  image_path VARCHAR(255) NULL,
  block_hash VARCHAR(100) NULL,
  timestamp TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (bin_id) REFERENCES bins(id) ON DELETE CASCADE,
  INDEX(bin_id), INDEX(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS rewards (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  points INT NOT NULL,
  description TEXT NULL,
  reason VARCHAR(255) NULL,
  disposal_id BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (disposal_id) REFERENCES disposals(id) ON DELETE SET NULL,
  INDEX(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bin_levels (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  bin_id INT NOT NULL,
  fill_percent TINYINT NOT NULL,
  measured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bin_id) REFERENCES bins(id) ON DELETE CASCADE,
  INDEX(bin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  bin_id INT NULL,
  type ENUM('BIN_FULL','DEVICE_OFFLINE','ANOMALY') NOT NULL,
  message VARCHAR(255),
  status ENUM('UNREAD','READ') DEFAULT 'UNREAD',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bin_id) REFERENCES bins(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS api_keys (
  id INT AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(120) UNIQUE NOT NULL,
  owner VARCHAR(120),
  scopes JSON NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  actor_user_id INT NULL,
  action VARCHAR(120) NOT NULL,
  meta JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(80) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Trigger to sync wastelist inserts to disposals
DELIMITER //
CREATE TRIGGER IF NOT EXISTS wastelist_to_disposals
AFTER INSERT ON wastelist
FOR EACH ROW
BEGIN
  DECLARE user_id_val INT;
  DECLARE bin_id_val INT;
  
  -- Get user_id from users table using VoterID
  SELECT id INTO user_id_val FROM users WHERE VoterID = NEW.VoterID LIMIT 1;
  
  -- Get bin_id from bins table using BinID
  SELECT id INTO bin_id_val FROM bins WHERE bin_id = NEW.BinID LIMIT 1;
  
  -- Insert into disposals if user_id and bin_id are found
  IF user_id_val IS NOT NULL AND bin_id_val IS NOT NULL THEN
    INSERT INTO disposals (user_id, bin_id, waste_type, volume_liters, confidence, points, timestamp, created_at)
    VALUES (user_id_val, bin_id_val, NEW.ClassifiedWaste, 1.0, 0.95, 10, NEW.DateTime, NOW());
  END IF;
END //
DELIMITER ;

-- Insert demo data into bins
INSERT INTO bins (bin_id, name, zone, location, location_lat, location_lng, status, fill_percent)
SELECT 'BIN-001', 'Main Campus Bin 1', 'Campus', 'Building A', 23.8103, 90.4125, 'OK', 20
WHERE NOT EXISTS (SELECT 1 FROM bins WHERE bin_id = 'BIN-001');

INSERT INTO bins (bin_id, name, zone, location, location_lat, location_lng, status, fill_percent)
SELECT 'BIN-002', 'Library Bin', 'Campus', 'Library Entrance', 23.8104, 90.4126, 'NEAR_FULL', 75
WHERE NOT EXISTS (SELECT 1 FROM bins WHERE bin_id = 'BIN-002');

INSERT INTO bins (bin_id, name, zone, location, location_lat, location_lng, status, fill_percent)
SELECT 'BIN-003', 'Cafeteria Bin', 'Campus', 'Cafeteria', 23.8105, 90.4127, 'FULL', 90
WHERE NOT EXISTS (SELECT 1 FROM bins WHERE bin_id = 'BIN-003');

INSERT INTO bins (bin_id, name, zone, location, location_lat, location_lng, status, fill_percent)
SELECT 'BIN-004', 'Dorm Bin', 'Residential', 'Dormitory B', 23.8106, 90.4128, 'OK', 30
WHERE NOT EXISTS (SELECT 1 FROM bins WHERE bin_id = 'BIN-004');

INSERT INTO bins (bin_id, name, zone, location, location_lat, location_lng, status, fill_percent)
SELECT 'BIN-005', 'Park Bin', 'Campus', 'Central Park', 23.8107, 90.4129, 'OK', 10
WHERE NOT EXISTS (SELECT 1 FROM bins WHERE bin_id = 'BIN-005');

-- Insert demo data from userinfo.csv into userinfo
INSERT INTO userinfo (VoterID, Name, FingerID, Timestamp)
SELECT '100', 'Saikat', '0', '2025-09-11 21:29:16'
WHERE NOT EXISTS (SELECT 1 FROM userinfo WHERE VoterID = '100');

INSERT INTO userinfo (VoterID, Name, FingerID, Timestamp)
SELECT '2000', 'Moon', '1', '2025-09-11 21:29:33'
WHERE NOT EXISTS (SELECT 1 FROM userinfo WHERE VoterID = '2000');

INSERT INTO userinfo (VoterID, Name, FingerID, Timestamp)
SELECT '3000', 'lol', '2', '2025-09-11 21:29:54'
WHERE NOT EXISTS (SELECT 1 FROM userinfo WHERE VoterID = '3000');

-- Insert demo data into users (mapped from userinfo)
INSERT INTO users (VoterID, Name, FingerID, role, points, join_date)
SELECT '100', 'Saikat', '0', 'USER', 0, '2025-09-11'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE VoterID = '100');

INSERT INTO users (VoterID, Name, FingerID, role, points, join_date)
SELECT '2000', 'Moon', '1', 'USER', 0, '2025-09-11'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE VoterID = '2000');

INSERT INTO users (VoterID, Name, FingerID, role, points, join_date)
SELECT '3000', 'lol', '2', 'USER', 0, '2025-09-11'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE VoterID = '3000');

-- Insert demo data from wastelist.csv into wastelist
INSERT INTO wastelist (DateTime, BinID, VoterID, Name, ClassifiedWaste)
SELECT '2025-09-11 21:59:55', 'BIN_001', '100', 'Saikat', 'plastic'
WHERE NOT EXISTS (SELECT 1 FROM wastelist WHERE DateTime = '2025-09-11 21:59:55' AND VoterID = '100');

INSERT INTO wastelist (DateTime, BinID, VoterID, Name, ClassifiedWaste)
SELECT '2025-09-11 22:00:21', 'BIN_001', '2000', 'Moon', 'plastic'
WHERE NOT EXISTS (SELECT 1 FROM wastelist WHERE DateTime = '2025-09-11 22:00:21' AND VoterID = '2000');

INSERT INTO wastelist (DateTime, BinID, VoterID, Name, ClassifiedWaste)
SELECT '2025-09-11 22:01:10', 'BIN_002', '300', 'John', 'organic'
WHERE NOT EXISTS (SELECT 1 FROM wastelist WHERE DateTime = '2025-09-11 22:01:10' AND VoterID = '300');

INSERT INTO wastelist (DateTime, BinID, VoterID, Name, ClassifiedWaste)
SELECT '2025-09-11 22:02:05', 'BIN_003', '400', 'Jane', 'metal'
WHERE NOT EXISTS (SELECT 1 FROM wastelist WHERE DateTime = '2025-09-11 22:02:05' AND VoterID = '400');

INSERT INTO wastelist (DateTime, BinID, VoterID, Name, ClassifiedWaste)
SELECT '2025-09-11 22:03:15', 'BIN_001', '500', 'Alex', 'glass'
WHERE NOT EXISTS (SELECT 1 FROM wastelist WHERE DateTime = '2025-09-11 22:03:15' AND VoterID = '500');

INSERT INTO wastelist (DateTime, BinID, VoterID, Name, ClassifiedWaste)
SELECT '2025-09-11 22:04:20', 'BIN_002', '600', 'Sam', 'plastic'
WHERE NOT EXISTS (SELECT 1 FROM wastelist WHERE DateTime = '2025-09-11 22:04:20' AND VoterID = '600');

INSERT INTO wastelist (DateTime, BinID, VoterID, Name, ClassifiedWaste)
SELECT '2025-09-11 22:05:30', 'BIN_003', '700', 'Lisa', 'organic'
WHERE NOT EXISTS (SELECT 1 FROM wastelist WHERE DateTime = '2025-09-11 22:05:30' AND VoterID = '700');

-- Insert existing demo data into disposals
INSERT INTO disposals (user_id, bin_id, waste_type, volume_liters, confidence, points, timestamp)
SELECT 1, (SELECT id FROM bins WHERE bin_id = 'BIN-001'), 'plastic', 2.5, 0.95, 10, '2023-08-11 14:30:45'
WHERE NOT EXISTS (SELECT 1 FROM disposals WHERE user_id = 1 AND bin_id = (SELECT id FROM bins WHERE bin_id = 'BIN-001') AND timestamp = '2023-08-11 14:30:45');

INSERT INTO disposals (user_id, bin_id, waste_type, volume_liters, confidence, points, timestamp)
SELECT 2, (SELECT id FROM bins WHERE bin_id = 'BIN-003'), 'glass', 3.0, 0.97, 12, '2023-08-10 10:15:32'
WHERE NOT EXISTS (SELECT 1 FROM disposals WHERE user_id = 2 AND bin_id = (SELECT id FROM bins WHERE bin_id = 'BIN-003') AND timestamp = '2023-08-10 10:15:32');

INSERT INTO disposals (user_id, bin_id, waste_type, volume_liters, confidence, points, timestamp)
SELECT 3, (SELECT id FROM bins WHERE bin_id = 'BIN-004'), 'metal', 3.5, 0.98, 15, '2023-08-09 16:45:21'
WHERE NOT EXISTS (SELECT 1 FROM disposals WHERE user_id = 3 AND bin_id = (SELECT id FROM bins WHERE bin_id = 'BIN-004') AND timestamp = '2023-08-09 16:45:21');

INSERT INTO disposals (user_id, bin_id, waste_type, volume_liters, confidence, points, timestamp)
SELECT 1, (SELECT id FROM bins WHERE bin_id = 'BIN-005'), 'organic', 1.5, 0.90, 5, '2023-08-09 11:20:54'
WHERE NOT EXISTS (SELECT 1 FROM disposals WHERE user_id = 1 AND bin_id = (SELECT id FROM bins WHERE bin_id = 'BIN-005') AND timestamp = '2023-08-09 11:20:54');

-- Insert existing demo data into rewards
INSERT INTO rewards (user_id, name, points, description, reason, disposal_id)
SELECT 1, 'Coffee Voucher', 50, 'Get a free coffee at participating cafes', 'Recycled plastic', (SELECT id FROM disposals WHERE user_id = 1 AND waste_type = 'plastic' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM rewards WHERE name = 'Coffee Voucher' AND user_id = 1);

INSERT INTO rewards (user_id, name, points, description, reason, disposal_id)
SELECT 2, 'Movie Ticket', 100, '50% off on movie tickets', 'Recycled glass', (SELECT id FROM disposals WHERE user_id = 2 AND waste_type = 'glass' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM rewards WHERE name = 'Movie Ticket' AND user_id = 2);

INSERT INTO rewards (user_id, name, points, description, reason, disposal_id)
SELECT 3, 'Shopping Discount', 200, '20% off at selected stores', 'Recycled metal', (SELECT id FROM disposals WHERE user_id = 3 AND waste_type = 'metal' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM rewards WHERE name = 'Shopping Discount' AND user_id = 3);

-- Insert existing demo data into admins
INSERT INTO admins (username, password_hash)
SELECT 'admin', '$2y$10$klLOxjgZOrmWf6JgtfjgKeI7rjFCdVz7dPOtW7dNwVardjGjsHIlC'
WHERE NOT EXISTS (SELECT 1 FROM admins WHERE username = 'admin');

-- Insert existing demo data into bin_levels
INSERT INTO bin_levels (bin_id, fill_percent, measured_at)
SELECT id, fill_percent, NOW() FROM bins;

-- Insert existing demo data into notifications
INSERT INTO notifications (bin_id, type, message, status)
SELECT id, 'BIN_FULL', CONCAT('Bin ', bin_id, ' is full and needs attention'), 'UNREAD'
FROM bins WHERE fill_percent >= 80 AND NOT EXISTS (
  SELECT 1 FROM notifications WHERE bin_id = bins.id AND type = 'BIN_FULL' AND status = 'UNREAD'
);

-- Additional Useful Queries
-- Get all bins with their latest fill levels
SELECT b.bin_id, b.name, b.zone, b.location, b.status, bl.fill_percent, bl.measured_at
FROM bins b
LEFT JOIN bin_levels bl ON b.id = bl.bin_id
WHERE bl.measured_at = (SELECT MAX(measured_at) FROM bin_levels WHERE bin_id = b.id);

-- Get user reward totals
SELECT u.VoterID, u.Name, u.points as total_points, COUNT(r.id) as rewards_count
FROM users u
LEFT JOIN rewards r ON u.id = r.user_id
GROUP BY u.id;

-- Get unread notifications
SELECT n.message, n.type, b.bin_id, b.name as bin_name
FROM notifications n
LEFT JOIN bins b ON n.bin_id = b.id
WHERE n.status = 'UNREAD';

-- View all users with their disposal count
SELECT u.VoterID, u.Name, COUNT(d.id) as disposal_count
FROM users u
LEFT JOIN disposals d ON u.id = d.user_id
GROUP BY u.id
ORDER BY u.created_at DESC;

-- Get disposal history with user and bin info
SELECT u.VoterID, u.Name, b.bin_id, b.location, d.waste_type, d.points, d.timestamp
FROM disposals d
JOIN users u ON d.user_id = u.id
JOIN bins b ON d.bin_id = b.id
ORDER BY d.timestamp DESC;