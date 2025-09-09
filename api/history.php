<?php
require_once 'config.php';

$pdo = initDatabase();
$method = $_SERVER['REQUEST_METHOD'];
$data = null;

if ($method === 'POST' || $method === 'DELETE') {
    $data = json_decode(file_get_contents('php://input'), true);
}

switch ($method) {
    case 'GET':
        // Get search history
        try {
            $stmt = $pdo->prepare('SELECT * FROM search_history ORDER BY last_searched DESC LIMIT 50');
            $stmt->execute();
            $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $result = [];
            foreach ($history as $item) {
                $result[] = [
                    'id' => intval($item['id']),
                    'query' => $item['query'],
                    'gender' => $item['gender'],
                    'searchCount' => intval($item['search_count']),
                    'lastSearched' => $item['last_searched']
                ];
            }
            
            sendJsonResponse($result);
        } catch (PDOException $e) {
            error_log('Database error: ' . $e->getMessage());
            sendErrorResponse('Failed to fetch search history', 500);
        }
        break;

    case 'POST':
        // Save search to history
        if (!isset($data['query'])) {
            sendErrorResponse('Query is required');
        }
        
        $query = trim($data['query']);
        $gender = $data['gender'] ?? 'all';
        
        if (empty($query)) {
            sendErrorResponse('Query cannot be empty');
        }
        
        try {
            // Check if this search already exists
            $stmt = $pdo->prepare('SELECT id, search_count FROM search_history WHERE query = ? AND gender = ?');
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
            
            sendJsonResponse(['message' => 'Search history updated']);
        } catch (PDOException $e) {
            error_log('Database error: ' . $e->getMessage());
            sendErrorResponse('Failed to save search history', 500);
        }
        break;

    case 'DELETE':
        // Delete search history item
        if (!isset($data['id'])) {
            sendErrorResponse('ID is required');
        }
        
        $id = intval($data['id']);
        
        if ($id <= 0) {
            sendErrorResponse('Invalid ID');
        }
        
        try {
            $stmt = $pdo->prepare('DELETE FROM search_history WHERE id = ?');
            $stmt->execute([$id]);
            
            if ($stmt->rowCount() > 0) {
                sendJsonResponse(['message' => 'Search history item deleted']);
            } else {
                sendErrorResponse('Search history item not found', 404);
            }
        } catch (PDOException $e) {
            error_log('Database error: ' . $e->getMessage());
            sendErrorResponse('Failed to delete search history', 500);
        }
        break;

    default:
        sendErrorResponse('Method not allowed', 405);
        break;
}
?>