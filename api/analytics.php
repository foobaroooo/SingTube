<?php
require_once 'config.php';

$pdo = initDatabase();
$method = $_SERVER['REQUEST_METHOD'];
$data = null;

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
}

switch ($method) {
    case 'POST':
        $action = $_GET['action'] ?? null;
        
        if ($action === 'track_search') {
            // Track search keyword
            if (!isset($data['query'])) {
                sendErrorResponse('Query is required');
            }
            
            // Normalize query: trim whitespace and convert to lowercase for consistency
            $query = strtolower(trim($data['query']));
            $gender = $data['gender'] ?? 'all';
            
            if (empty($query)) {
                sendErrorResponse('Query cannot be empty');
            }
            
            try {
                // Check if this search already exists (case insensitive)
                $stmt = $pdo->prepare('SELECT id, search_count FROM search_history WHERE LOWER(query) = ? AND gender = ?');
                $stmt->execute([$query, $gender]);
                $existing = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($existing) {
                    // Update existing search
                    $stmt = $pdo->prepare('UPDATE search_history SET search_count = search_count + 1, last_searched = CURRENT_TIMESTAMP WHERE id = ?');
                    $stmt->execute([intval($existing['id'])]);
                } else {
                    // Insert new search
                    $stmt = $pdo->prepare('INSERT INTO search_history (query, gender, search_count, last_searched) VALUES (?, ?, 1, CURRENT_TIMESTAMP)');
                    $stmt->execute([$query, $gender]);
                }
                
                sendJsonResponse(['message' => 'Search tracked successfully']);
            } catch (PDOException $e) {
                error_log('Database error: ' . $e->getMessage());
                sendErrorResponse('Failed to track search', 500);
            }
            
        } else if ($action === 'track_play') {
            // Track played song
            if (!isset($data['youtube_id']) || !isset($data['title'])) {
                sendErrorResponse('YouTube ID and title are required');
            }
            
            $youtube_id = trim($data['youtube_id']);
            $title = trim($data['title']);
            $artist = trim($data['artist'] ?? '');
            $duration = $data['duration'] ?? '';
            $thumbnail = $data['thumbnail'] ?? '';
            
            if (empty($youtube_id) || empty($title)) {
                sendErrorResponse('YouTube ID and title cannot be empty');
            }
            
            try {
                // Check if this song already exists
                $stmt = $pdo->prepare('SELECT id, play_count FROM played_songs WHERE youtube_id = ?');
                $stmt->execute([$youtube_id]);
                $existing = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($existing) {
                    // Update existing song
                    $stmt = $pdo->prepare('UPDATE played_songs SET play_count = play_count + 1, last_played = CURRENT_TIMESTAMP WHERE id = ?');
                    $stmt->execute([intval($existing['id'])]);
                } else {
                    // Insert new song
                    $stmt = $pdo->prepare('INSERT INTO played_songs (youtube_id, title, artist, duration, thumbnail, play_count, first_played, last_played) VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)');
                    $stmt->execute([$youtube_id, $title, $artist, $duration, $thumbnail]);
                }
                
                sendJsonResponse(['message' => 'Song play tracked successfully']);
            } catch (PDOException $e) {
                error_log('Database error: ' . $e->getMessage());
                sendErrorResponse('Failed to track song play', 500);
            }
        } else {
            sendErrorResponse('Invalid action');
        }
        break;
        
    case 'GET':
        $type = $_GET['type'] ?? null;
        $period = $_GET['period'] ?? 'week'; // week, month, all
        $limit = intval($_GET['limit'] ?? 100);
        
        try {
            if ($type === 'top_songs') {
                // Get top played songs
                $whereClause = '';
                if ($period === 'week') {
                    $whereClause = "WHERE last_played >= datetime('now', '-7 days')";
                } else if ($period === 'month') {
                    $whereClause = "WHERE last_played >= datetime('now', '-30 days')";
                } else if ($period === 'year') {
                    $whereClause = "WHERE last_played >= datetime('now', '-365 days')";
                }
                
                $stmt = $pdo->prepare("SELECT youtube_id, title, artist, duration, thumbnail, play_count, first_played, last_played FROM played_songs $whereClause ORDER BY play_count DESC, last_played DESC LIMIT ?");
                $stmt->execute([$limit]);
                $songs = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                $result = [];
                foreach ($songs as $song) {
                    $result[] = [
                        'youtubeId' => $song['youtube_id'],
                        'title' => $song['title'],
                        'artist' => $song['artist'],
                        'duration' => $song['duration'],
                        'thumbnail' => $song['thumbnail'],
                        'playCount' => intval($song['play_count']),
                        'firstPlayed' => $song['first_played'],
                        'lastPlayed' => $song['last_played']
                    ];
                }
                
                sendJsonResponse($result);
                
            } else if ($type === 'top_keywords') {
                // Get top searched keywords
                $whereClause = '';
                if ($period === 'week') {
                    $whereClause = "WHERE last_searched >= datetime('now', '-7 days')";
                } else if ($period === 'month') {
                    $whereClause = "WHERE last_searched >= datetime('now', '-30 days')";
                } else if ($period === 'year') {
                    $whereClause = "WHERE last_searched >= datetime('now', '-365 days')";
                }
                
                $stmt = $pdo->prepare("SELECT query, gender, search_count, last_searched FROM search_history $whereClause ORDER BY search_count DESC, last_searched DESC LIMIT ?");
                $stmt->execute([$limit]);
                $keywords = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                $result = [];
                foreach ($keywords as $keyword) {
                    $result[] = [
                        'query' => $keyword['query'],
                        'gender' => $keyword['gender'],
                        'searchCount' => intval($keyword['search_count']),
                        'lastSearched' => $keyword['last_searched']
                    ];
                }
                
                sendJsonResponse($result);
                
            } else {
                sendErrorResponse('Invalid type. Use "top_songs" or "top_keywords"');
            }
        } catch (PDOException $e) {
            error_log('Database error: ' . $e->getMessage());
            sendErrorResponse('Failed to fetch analytics data', 500);
        }
        break;
        
    default:
        sendErrorResponse('Method not allowed', 405);
        break;
}
?>