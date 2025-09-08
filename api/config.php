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

// YouTube API configuration
define('YOUTUBE_API_KEY', $_ENV['YOUTUBE_API_KEY'] ?? '');
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
?>