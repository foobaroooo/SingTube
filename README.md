# SingTube (Beta)

**The Missing Karaoke Player for YouTube**

SingTube is a modern web-based karaoke application that transforms YouTube videos into a seamless karaoke experience. Built specifically for Chinese songs with karaoke/instrumental versions, it provides queue management, auto-advance playback, and gender preference filtering.

## ✨ Features

### 🎵 **Smart Search & Discovery**
- Search YouTube for karaoke songs with gender preference filtering (male/female versions)
- Real-time search with infinite scroll for more results
- Search history with quick access to previous queries

### 📝 **Queue Management**
- Add songs to queue with drag-and-drop reordering
- Play/pause controls with visual feedback
- Previous/next navigation through queue
- Auto-advance to next song when current song ends
- Save and load custom playlists

### 🎬 **Integrated Video Player**
- Embedded YouTube player with full controls
- Automatic retry mechanism for slow-loading videos
- Seamless video transitions between songs
- Play videos directly in the preview pane

### 💾 **Playlist Features**
- Save current queue as named playlists
- Load previously saved playlists
- Delete unwanted playlists
- Automatic synchronization of queue changes to saved playlists

### 🎨 **Modern UI/UX**
- Dark theme optimized for karaoke environments
- Responsive design works on desktop and mobile
- Smooth animations and transitions
- Toast notifications for user feedback
- Maximizable queue view for better visibility

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Modern web browser with JavaScript enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SingTube
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and add your YouTube Data API v3 key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Open http://localhost:8080 in your browser

## 🎯 How to Use

### Basic Workflow

1. **Search for Songs**
   - Enter song name or artist in the search bar
   - Select gender preference (All, Male, Female)
   - Browse results and click "Add to Queue" or "Add to Front"

2. **Manage Your Queue**
   - Songs appear in the queue panel on the right
   - Click on any song to select it for preview
   - Use drag handles to reorder songs
   - Remove songs with the X button

3. **Control Playback**
   - Click the round play button in the queue header to start playing
   - Button changes to pause when playing
   - Use previous/next buttons to navigate
   - Videos auto-advance to next song when finished

4. **Save Playlists**
   - Click the save icon in queue header
   - Enter a name for your playlist
   - Load saved playlists anytime with the folder icon

### Pro Tips

- **Search History**: Recent searches appear below the search bar for quick access
- **Queue Maximizing**: Click the maximize button to focus on your queue
- **Auto-Advance**: Songs automatically play the next one in queue when finished
- **Mobile Friendly**: Works great on phones and tablets for portable karaoke

## 🛠 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: shadcn/ui components with Radix UI primitives
- **Styling**: TailwindCSS with custom design system
- **Backend**: PHP with SQLite database
- **APIs**: YouTube Data API v3
- **State Management**: React hooks with localStorage persistence

## 📋 Development

### Available Scripts

```bash
# Start development server (port 8080)
npm run dev

# Build for production
npm run build

# Build for development
npm run build:dev

# Lint code
npm run lint

# Preview production build
npm run preview
```

### Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui base components
│   ├── SearchSection/  # Search functionality
│   ├── QueueSection/   # Queue management
│   └── CurrentSong/    # Video player & controls
├── hooks/              # Custom React hooks
├── services/           # API integration
├── pages/              # Main application pages
└── assets/             # Static assets

api/                    # PHP backend
├── youtube.php         # YouTube search API
├── queues.php          # Playlist management
├── history.php         # Search history
└── config.php          # Database setup
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🎉 Acknowledgments

- Built with love for karaoke enthusiasts
- YouTube Data API for video search and playback
- shadcn/ui for beautiful, accessible components
- The open-source community for inspiration and tools

---

**Ready to sing?** 🎤 Fire up SingTube and start your karaoke session!