<?php
require_once 'config.php';

$pdo = initDatabase();
$method = $_SERVER['REQUEST_METHOD'];
$data = null;

if ($method === 'POST' || $method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
}

switch ($method) {
    case 'GET':
        // Get all saved queues
        try {
            $stmt = $pdo->prepare('SELECT * FROM saved_queues ORDER BY updated_at DESC');
            $stmt->execute();
            $queues = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $result = [];
            foreach ($queues as $queue) {
                $result[] = [
                    'id' => intval($queue['id']),
                    'name' => $queue['name'],
                    'songs' => json_decode($queue['songs'], true),
                    'createdAt' => $queue['created_at'],
                    'updatedAt' => $queue['updated_at']
                ];
            }
            
            sendJsonResponse($result);
        } catch (PDOException $e) {
            error_log('Database error: ' . $e->getMessage());
            sendErrorResponse('Failed to fetch queues', 500);
        }
        break;

    case 'POST':
        // Save a new queue
        if (!isset($data['name']) || !isset($data['songs'])) {
            sendErrorResponse('Name and songs are required');
        }
        
        if (empty(trim($data['name']))) {
            sendErrorResponse('Queue name cannot be empty');
        }
        
        if (empty($data['songs'])) {
            sendErrorResponse('Cannot save an empty queue');
        }
        
        try {
            $stmt = $pdo->prepare('INSERT INTO saved_queues (name, songs) VALUES (?, ?)');
            $stmt->execute([
                trim($data['name']),
                json_encode($data['songs'])
            ]);
            
            $queueId = $pdo->lastInsertId();
            
            sendJsonResponse([
                'id' => intval($queueId),
                'message' => 'Queue saved successfully'
            ]);
        } catch (PDOException $e) {
            error_log('Database error: ' . $e->getMessage());
            sendErrorResponse('Failed to save queue', 500);
        }
        break;

    case 'PUT':
        // Update an existing queue
        if (!isset($data['id']) || !isset($data['name']) || !isset($data['songs'])) {
            sendErrorResponse('ID, name and songs are required');
        }
        
        if (empty(trim($data['name']))) {
            sendErrorResponse('Queue name cannot be empty');
        }
        
        if (empty($data['songs'])) {
            sendErrorResponse('Cannot save an empty queue');
        }
        
        try {
            $stmt = $pdo->prepare('UPDATE saved_queues SET name = ?, songs = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
            $stmt->execute([
                trim($data['name']),
                json_encode($data['songs']),
                intval($data['id'])
            ]);
            
            if ($stmt->rowCount() > 0) {
                sendJsonResponse([
                    'id' => intval($data['id']),
                    'message' => 'Queue updated successfully'
                ]);
            } else {
                sendErrorResponse('Queue not found', 404);
            }
        } catch (PDOException $e) {
            error_log('Database error: ' . $e->getMessage());
            sendErrorResponse('Failed to update queue', 500);
        }
        break;

    case 'DELETE':
        // Delete a queue
        $queueId = $_GET['id'] ?? null;
        
        if (!$queueId || !is_numeric($queueId)) {
            sendErrorResponse('Valid queue ID is required');
        }
        
        try {
            $stmt = $pdo->prepare('DELETE FROM saved_queues WHERE id = ?');
            $stmt->execute([intval($queueId)]);
            
            if ($stmt->rowCount() > 0) {
                sendJsonResponse(['message' => 'Queue deleted successfully']);
            } else {
                sendErrorResponse('Queue not found', 404);
            }
        } catch (PDOException $e) {
            error_log('Database error: ' . $e->getMessage());
            sendErrorResponse('Failed to delete queue', 500);
        }
        break;

    default:
        sendErrorResponse('Method not allowed', 405);
        break;
}
?>