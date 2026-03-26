<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'config.php';

$pdo = getDB();

$data = json_decode(file_get_contents('php://input'), true);
$action = $data['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'verifyAdmin':
        $username = $data['username'];
        $password = $data['password'];
        $stmt = $pdo->prepare("SELECT * FROM admins WHERE username = ?");
        $stmt->execute([$username]);
        $admin = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($admin && password_verify($password, $admin['password_hash'])) {
            echo json_encode($admin);
        } else {
            echo json_encode(false);
        }
        break;

    case 'verifyUser':
        $voterId = $data['voterId'];
        $fingerId = $data['fingerId'];
        $stmt = $pdo->prepare("SELECT * FROM users WHERE VoterID = ? AND FingerID = ? AND role = 'USER'");
        $stmt->execute([$voterId, $fingerId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode($user ? $user : false);
        break;

    case 'addUser':
        $voterId = $data['voterId'];
        $name = $data['name'];
        $fingerId = $data['fingerId'];
        try {
            // Insert into userinfo first
            $stmt = $pdo->prepare("INSERT INTO userinfo (VoterID, Name, FingerID, Timestamp) VALUES (?, ?, ?, NOW())");
            $stmt->execute([$voterId, $name, $fingerId]);
            // Then insert into users
            $stmt = $pdo->prepare("INSERT INTO users (VoterID, Name, FingerID, role, join_date) VALUES (?, ?, ?, 'USER', CURDATE())");
            $stmt->execute([$voterId, $name, $fingerId]);
            echo json_encode(['ok' => true, 'user_id' => $pdo->lastInsertId()]);
        } catch (PDOException $e) {
            echo json_encode(['error' => 'Registration failed: ' . $e->getMessage()]);
        }
        break;

    case 'updateUser':
        $id = $data['id'];
        $voterId = $data['voterId'];
        $name = $data['name'];
        $fingerId = $data['fingerId'];
        try {
            $stmt = $pdo->prepare("UPDATE userinfo SET Name = ?, FingerID = ?, Timestamp = NOW() WHERE VoterID = ?");
            $stmt->execute([$name, $fingerId, $voterId]);
            $stmt = $pdo->prepare("UPDATE users SET VoterID = ?, Name = ?, FingerID = ? WHERE id = ?");
            $stmt->execute([$voterId, $name, $fingerId, $id]);
            $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
        } catch (PDOException $e) {
            echo json_encode(['error' => 'Update failed: ' . $e->getMessage()]);
        }
        break;

    case 'getData':
        $users = $pdo->query("SELECT * FROM users")->fetchAll(PDO::FETCH_ASSOC);
        $bins = $pdo->query("SELECT id, bin_id AS binId, name, zone, location, location_lat AS lat, location_lng AS lng, fill_percent AS trashLevel, status FROM bins")->fetchAll(PDO::FETCH_ASSOC);
        $disposals = $pdo->query("SELECT * FROM disposals")->fetchAll(PDO::FETCH_ASSOC);
        $rewards = $pdo->query("SELECT * FROM rewards")->fetchAll(PDO::FETCH_ASSOC);
        $notifications = $pdo->query("SELECT * FROM notifications")->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['users' => $users, 'bins' => $bins, 'disposals' => $disposals, 'rewards' => $rewards, 'notifications' => $notifications]);
        break;

    case 'getDisposals':
        $disposals = $pdo->query("SELECT * FROM disposals")->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($disposals);
        break;

    case 'addBin':
        $binId = $data['binId'];
        $name = $data['name'];
        $zone = $data['zone'];
        $location = $data['location'];
        $lat = $data['lat'];
        $lng = $data['lng'];
        $stmt = $pdo->prepare("INSERT INTO bins (bin_id, name, zone, location, location_lat, location_lng) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$binId, $name, $zone, $location, $lat, $lng]);
        $newId = $pdo->lastInsertId();
        $stmt = $pdo->prepare("SELECT id, bin_id AS binId, name, zone, location, location_lat AS lat, location_lng AS lng, fill_percent AS trashLevel, status FROM bins WHERE id = ?");
        $stmt->execute([$newId]);
        echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
        break;

    case 'updateBin':
        $id = $data['id'];
        $binId = $data['binId'];
        $name = $data['name'];
        $zone = $data['zone'];
        $location = $data['location'];
        $lat = $data['lat'];
        $lng = $data['lng'];
        $stmt = $pdo->prepare("UPDATE bins SET bin_id = ?, name = ?, zone = ?, location = ?, location_lat = ?, location_lng = ? WHERE id = ?");
        $stmt->execute([$binId, $name, $zone, $location, $lat, $lng, $id]);
        $stmt = $pdo->prepare("SELECT id, bin_id AS binId, name, zone, location, location_lat AS lat, location_lng AS lng, fill_percent AS trashLevel, status FROM bins WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
        break;

    case 'deleteBin':
        $id = $data['id'];
        $stmt = $pdo->prepare("DELETE FROM bins WHERE id = ?");
        $result = $stmt->execute([$id]);
        echo json_encode($result);
        break;

    case 'redeemReward':
        $userId = $data['userId'];
        $rewardId = $data['rewardId'];
        $points = $data['points'];
        $stmt = $pdo->prepare("SELECT points FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $currentPoints = $stmt->fetchColumn();
        if ($currentPoints >= $points) {
            $stmt = $pdo->prepare("UPDATE users SET points = points - ? WHERE id = ?");
            $stmt->execute([$points, $userId]);
            $stmt = $pdo->prepare("INSERT INTO rewards (user_id, name, points, description, reason) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$userId, "Reward $rewardId", $points, "Redeemed via dashboard", "Reward redemption"]);
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Insufficient points']);
        }
        break;

    case 'markNotificationRead':
        $id = $data['id'];
        $stmt = $pdo->prepare("UPDATE notifications SET status = 'READ' WHERE id = ?");
        $result = $stmt->execute([$id]);
        echo json_encode($result);
        break;

    default:
        echo json_encode(['error' => 'Invalid action']);
}
?>