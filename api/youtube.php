<?php
require_once 'config.php';

function buildKaraokeQuery($query, $gender = 'all') {
    // Base karaoke keywords in Chinese and English
    $karaokeTerms = ['伴奏', '卡拉OK', 'karaoke', 'instrumental', '纯音乐', '纯伴奏', 'backing track'];
    
    $searchQuery = $query;
    
    // Add gender-specific terms
    if ($gender === 'male') {
        $searchQuery .= ' 男声版 男生版 male version';
    } elseif ($gender === 'female') {
        $searchQuery .= ' 女声版 女生版 female version';
    }
    
    // Add one karaoke term to improve results
    $searchQuery .= ' ' . $karaokeTerms[0];
    
    return $searchQuery;
}

function formatDuration($duration) {
    // Convert ISO 8601 duration to readable format (PT4M13S -> 4:13)
    preg_match('/PT(?:(\d+)M)?(?:(\d+)S)?/', $duration, $matches);
    
    $minutes = isset($matches[1]) ? intval($matches[1]) : 0;
    $seconds = isset($matches[2]) ? intval($matches[2]) : 0;
    
    return sprintf('%d:%02d', $minutes, $seconds);
}

function searchYouTubeVideos($query, $gender = 'all', $maxResults = 25) {
    if (empty(YOUTUBE_API_KEY)) {
        sendErrorResponse('YouTube API key is not configured', 500);
    }

    if (empty(trim($query))) {
        return [];
    }

    try {
        // Build karaoke-optimized search query
        $karaokeQuery = buildKaraokeQuery($query, $gender);
        
        // First, search for videos
        $searchUrl = YOUTUBE_API_BASE_URL . '/search?' . http_build_query([
            'key' => YOUTUBE_API_KEY,
            'q' => $karaokeQuery,
            'part' => 'snippet',
            'type' => 'video',
            'maxResults' => $maxResults,
            'order' => 'relevance',
            'regionCode' => 'TW', // Taiwan region for better Chinese content
            'relevanceLanguage' => 'zh', // Chinese language preference
            'safeSearch' => 'moderate',
        ]);

        $searchResponse = file_get_contents($searchUrl);
        if ($searchResponse === false) {
            sendErrorResponse('Failed to fetch search results', 500);
        }
        
        $searchData = json_decode($searchResponse, true);
        if (!isset($searchData['items'])) {
            return [];
        }

        $videoIds = [];
        foreach ($searchData['items'] as $item) {
            if (isset($item['id']['videoId'])) {
                $videoIds[] = $item['id']['videoId'];
            }
        }

        if (empty($videoIds)) {
            return [];
        }

        // Get video details including duration
        $detailsUrl = YOUTUBE_API_BASE_URL . '/videos?' . http_build_query([
            'key' => YOUTUBE_API_KEY,
            'id' => implode(',', $videoIds),
            'part' => 'contentDetails',
        ]);

        $detailsResponse = file_get_contents($detailsUrl);
        if ($detailsResponse === false) {
            sendErrorResponse('Failed to fetch video details', 500);
        }
        
        $detailsData = json_decode($detailsResponse, true);

        // Combine search results with duration data
        $songs = [];
        foreach ($searchData['items'] as $index => $item) {
            $details = isset($detailsData['items'][$index]) ? $detailsData['items'][$index] : null;
            $duration = isset($details['contentDetails']['duration']) ? $details['contentDetails']['duration'] : 'PT0S';
            
            $songs[] = [
                'id' => $item['id']['videoId'],
                'title' => $item['snippet']['title'],
                'artist' => $item['snippet']['channelTitle'],
                'thumbnail' => $item['snippet']['thumbnails']['medium']['url'],
                'duration' => formatDuration($duration),
                'youtubeId' => $item['id']['videoId'],
            ];
        }

        // Filter out very short videos (likely not full songs) and very long ones (likely not karaoke)
        $filteredSongs = [];
        foreach ($songs as $song) {
            list($minutes, $seconds) = explode(':', $song['duration']);
            $totalSeconds = intval($minutes) * 60 + intval($seconds);
            if ($totalSeconds >= 60 && $totalSeconds <= 600) { // Between 1 and 10 minutes
                $filteredSongs[] = $song;
            }
        }

        return $filteredSongs;

    } catch (Exception $e) {
        error_log('YouTube API Error: ' . $e->getMessage());
        sendErrorResponse('YouTube search failed', 500);
    }
}

// Handle the API request
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $query = $_GET['q'] ?? '';
    $gender = $_GET['gender'] ?? 'all';
    $maxResults = intval($_GET['maxResults'] ?? 25);
    
    $results = searchYouTubeVideos($query, $gender, $maxResults);
    sendJsonResponse($results);
} else {
    sendErrorResponse('Method not allowed', 405);
}
?>