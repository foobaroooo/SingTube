<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Database configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'singtube');
define('DB_USER', 'root');
define('DB_PASS', '');

// Load environment variables
if (file_exists(__DIR__ . '/../.env')) {
    $lines = file(__DIR__ . '/../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        list($name, $value) = explode('=', $line, 2);
        $_ENV[$name] = $value;
        putenv("$name=$value");
    }
}

// YouTube API configuration
define('YOUTUBE_API_KEY', $_ENV['YOUTUBE_API_KEY'] ?? getenv('YOUTUBE_API_KEY') ?? '');
define('YOUTUBE_API_BASE_URL', 'https://www.googleapis.com/youtube/v3');

// Initialize SQLite database
function initDatabase() {
    try {
        $pdo = new PDO('sqlite:' . __DIR__ . '/singtube.db');
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // Create tables if they don't exist
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS saved_queues (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                songs TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS search_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                query TEXT NOT NULL,
                gender TEXT DEFAULT 'all',
                search_count INTEGER DEFAULT 1,
                last_searched DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(query, gender)
            );

            CREATE TABLE IF NOT EXISTS user_preferences (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        ");
        
        // Add GUID column if it doesn't exist (for existing databases)
        try {
            $pdo->exec("ALTER TABLE saved_queues ADD COLUMN guid TEXT");
        } catch (PDOException $e) {
            // Column already exists, ignore
        }
        
        // Generate GUIDs for existing rows that don't have them
        $stmt = $pdo->query("SELECT id FROM saved_queues WHERE guid IS NULL OR guid = ''");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($rows as $row) {
            $guid = generateGUID();
            $updateStmt = $pdo->prepare("UPDATE saved_queues SET guid = ? WHERE id = ?");
            $updateStmt->execute([$guid, $row['id']]);
        }
        
        // Add unique constraint after populating GUIDs
        try {
            $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_queues_guid ON saved_queues(guid)");
        } catch (PDOException $e) {
            // Index already exists, ignore
        }
        
        return $pdo;
    } catch (PDOException $e) {
        error_log('Database connection failed: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Database connection failed']);
        exit;
    }
}

function sendJsonResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function sendErrorResponse($message, $status = 400) {
    http_response_code($status);
    echo json_encode(['error' => $message]);
    exit;
}

function generateGUID() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}
?>