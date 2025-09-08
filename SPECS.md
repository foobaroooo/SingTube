# 🎤 Karaoke Player Web App – Specification

## 1. Overview

A web-based **Karaoke Player** that leverages **YouTube videos** as the media source.  
The system focuses on **Chinese songs (instrumental/karaoke versions)** initially, with future support for other languages.  
Users can **search, queue, and play** karaoke tracks directly from YouTube, with options for gender preference (male/female versions).

---

## 2. Core Features

### 2.1 YouTube Video Integration
- **Search API**: Use YouTube Data API v3 to search for videos.  
- **Filters**: Apply keyword filters like `"instrumental"`, `"karaoke"`, `"伴奏"`, `"纯音乐"` to return karaoke-ready results.  
- **Video Links**: Generate direct hyperlinks to YouTube videos for external playback.  
- **Content Source**: Strictly from **YouTube videos**, not YouTube Music.  

---

### 2.2 Search Functionality
- **Search Bar**: User types keywords (song name, artist, etc.).  
- **Language Constraint**: Default search is limited to **Chinese songs**.  
- **Gender Filter**: Dropdown toggle to refine search:  
  - Male version (男声版 / 男生)  
  - Female version (女声版 / 女生)  
- **Result Display**:  
  - Song Title  
  - Artist (if available)  
  - Cover thumbnail (from YouTube video metadata)  

---

### 2.3 Song Queue Management
- **Add to Queue**: Each search result has an **“Add”** button.  
- **Queue Operations**:  
  - Add song to **end** of queue  
  - Add song to **front** of queue (priority play)  
  - Remove songs from queue  
  - Reorder songs via drag-and-drop  
- **Now Playing Display**:  
  - Currently selected song with YouTube link  
  - Song title + cover photo  
  - Queue list below  

---

### 2.4 User Interface (UI)
- **Search Section** (top): search box + gender filter + search button.  
- **Results Section** (left side): grid/list of YouTube search results with cover, title, and add-to-queue button.  
- **Current Song Section** (center): display current song with YouTube link and song details.  
- **Queue Section** (right side): list of upcoming songs with reorder/priority controls.  

---

### 2.5 Queue Controls
- **Next / Previous** navigation through queue.  
- **Play Button** to open current song's YouTube link in new tab/window.  
- **Remove from Queue** functionality.  

---

## 3. Technical Requirements

### 3.1 Frontend
- **Framework**: React (for interactive queue & search).  
- **UI Components**: TailwindCSS or Material UI for clean design.  
- **YouTube Integration**: Generate YouTube video URLs for external playback.  

### 3.2 Backend
- **API Server**: PHP  
- **Proxy for YouTube API** (to hide API keys from frontend).  
- **Data Handling**:  
  - Song queue (stored in frontend state, optional backend persistence for multi-user).  

### 3.3 Integrations
- **YouTube Data API v3** for search results and video metadata.  

---

## 4. Future Enhancements
- **Multi-language support**: Expand from Chinese to English, Japanese, Korean.  
- **Lyrics Integration**: Sync lyrics (via 3rd party API like Musixmatch or manual upload).  
- **User Profiles**: Save favorite songs/queues.  
- **Multi-Device Support**: Remote control via mobile.  
- **Offline Caching**: Store queue temporarily in browser for session recovery.  

---

## 5. Caveats & Considerations
- **Latency**: YouTube search API results may vary in quality. Need strong keyword filtering for instrumental versions.  
- **Copyright**: App relies on YouTube’s embed system to remain compliant.  
- **Performance**: Queue management must handle at least **100 songs smoothly**.  
- **Scaling**: Should support multiple users per room in future karaoke party mode.  
