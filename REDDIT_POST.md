# SingTube v2.1.0 Released - Quality of Life Updates & Testing Infrastructure

Hi everyone! I'm excited to share the latest update to SingTube, my web-based karaoke player that uses YouTube videos with real-time collaboration.

## What's New in v2.1.0

### Bug Fixes 🐛

**Search History Now Actually Works**
- Fixed the search history to show your most recent searches first (it was incorrectly showing the most popular ones instead)
- This was surprisingly tricky to debug in production - turned out PM2 was running from a different directory!

**Better UX on Page Load**
- The "no search, please search for a song" prompt now appears when you first load the app
- The room/queue page is now the default view for hosts (makes more sense than showing the search page)

### New Features ✨

**Testing Infrastructure**
- Added comprehensive unit testing with Vitest
- 10 test cases covering the search history API
- Automated pre-commit hooks with Husky - tests run before every commit
- Tests run automatically on file changes in watch mode
- This should prevent bugs from sneaking into production!

**Better Internationalization**
- Added Chinese translations for the entire search section
- Button labels, tooltips, and all UI text now fully bilingual
- Thanks to everyone who requested this!

**Production Deployment Guide**
- Created a comprehensive MANUAL-DEPLOYMENT.md
- Step-by-step instructions for deploying to DigitalOcean
- Common issues and solutions documented
- Database backup strategies included

## Quick Stats

- **Cost**: ~$7/month on DigitalOcean
- **Tech Stack**: React + TypeScript + Socket.io + SQLite
- **Real-time**: Up to 10 users can collaborate simultaneously
- **Mobile-friendly**: Fully responsive design

## Try It Out

🎤 **Live Demo**: [singtube.app](https://singtube.app) (if you want to check it out)

## What's Next?

Working on implementing a KTV-style "played songs" feature where:
- Songs are marked as played after completion
- Played songs remain in queue but are dimmed out
- Can't replay completed songs
- Just like real karaoke systems!

Also considering:
- User presence indicators (see who's online)
- Connection resilience and auto-reconnection
- Room capacity indicators

---

**For Developers:**

If you're building anything with real-time sync, I highly recommend:
- Socket.io for WebSocket management (so much easier than raw WebSocket)
- SQLite with WAL mode for concurrent access
- Vitest for testing (way faster than Jest)
- Husky for automated pre-commit testing

The hardest bug this week was the search history sorting - the code was correct locally but production kept showing the wrong order. Turned out the PM2 process manager was running code from `/opt/singtube/` instead of `/var/www/singtube/`. Always verify your deployment paths! 😅

---

Happy to answer any questions about the stack, deployment, or real-time collaboration patterns!
