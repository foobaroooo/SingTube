**SingTube v2.1.0 Released - Quality of Life Updates & Testing Infrastructure**

Hi everyone! I'm excited to share the latest update to SingTube, my web-based karaoke player that uses YouTube videos with real-time collaboration.

&nbsp;

**What's New in v2.1.0**

&nbsp;

*Bug Fixes 🐛*

**Search History Now Actually Works**

* Fixed the search history to show your most recent searches first (it was incorrectly showing the most popular ones instead)
* This was surprisingly tricky to debug in production - turned out PM2 was running from a different directory!

**Better UX on Page Load**

* The "no search, please search for a song" prompt now appears when you first load the app
* The room/queue page is now the default view for hosts (makes more sense than showing the search page)

&nbsp;

*New Features ✨*

**Testing Infrastructure**

* Added comprehensive unit testing with Vitest
* 10 test cases covering the search history API
* Automated pre-commit hooks with Husky - tests run before every commit
* Tests run automatically on file changes in watch mode
* This should prevent bugs from sneaking into production!

**Better Internationalization**

* Added Chinese translations for the entire search section
* Button labels, tooltips, and all UI text now fully bilingual
* Thanks to everyone who requested this!

**Production Deployment Guide**

* Created a comprehensive deployment guide
* Step-by-step instructions and common issues documented
* Database backup strategies included

&nbsp;

**Try It Out**

🎤 **Live Demo**: https://singtube.app

💻 **GitHub**: Feel free to ask for the repo link

&nbsp;

The app uses WebSockets for real-time sync, so up to 10 people can collaborate in the same karaoke room and see song additions instantly. Pretty handy for parties!

&nbsp;

**What's Next?**

Working on a KTV-style "played songs" feature where completed songs stay in the queue but are dimmed out (just like real karaoke systems). Also considering user presence indicators and better connection resilience.

&nbsp;

The hardest bug this week was the search history sorting - the code was correct locally but production kept showing the wrong order. Turned out the PM2 process manager was running code from a different directory than I thought. Always double-check your deployment paths! 😅

&nbsp;

Happy to answer any questions!
