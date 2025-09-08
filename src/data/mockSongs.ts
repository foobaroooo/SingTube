import { Song } from "@/components/SongCard";

export const mockSongs: Song[] = [
  {
    id: "1",
    title: "月亮代表我的心 (伴奏版)",
    artist: "邓丽君 Karaoke",
    thumbnail: "https://img.youtube.com/vi/5YJP0WCOdSU/mqdefault.jpg",
    duration: "3:24",
    youtubeId: "5YJP0WCOdSU"
  },
  {
    id: "2", 
    title: "青花瓷 (纯音乐伴奏)",
    artist: "周杰伦 Instrumental",
    thumbnail: "https://img.youtube.com/vi/QC22av9V8Zs/mqdefault.jpg",
    duration: "3:58",
    youtubeId: "QC22av9V8Zs"
  },
  {
    id: "3",
    title: "小幸运 (女声伴奏)",
    artist: "田馥甄 Female Version",
    thumbnail: "https://img.youtube.com/vi/ypGw2gyQCzY/mqdefault.jpg", 
    duration: "4:12",
    youtubeId: "ypGw2gyQCzY"
  },
  {
    id: "4",
    title: "我的歌声里 (男声版)",
    artist: "曲婉婷 Male Cover",
    thumbnail: "https://img.youtube.com/vi/HgqAJhb1jGU/mqdefault.jpg",
    duration: "3:45",
    youtubeId: "HgqAJhb1jGU"
  },
  {
    id: "5",
    title: "稻香 (卡拉OK版)",
    artist: "周杰伦 Karaoke",
    thumbnail: "https://img.youtube.com/vi/2VdUnGl_qFM/mqdefault.jpg",
    duration: "3:33",
    youtubeId: "2VdUnGl_qFM"
  },
  {
    id: "6",
    title: "爱的供养 (纯伴奏)",
    artist: "杨幂 Instrumental",
    thumbnail: "https://img.youtube.com/vi/W8k4LRFUHws/mqdefault.jpg",
    duration: "4:01",
    youtubeId: "W8k4LRFUHws"
  },
  {
    id: "7",
    title: "千千阙歌 (女声版)",
    artist: "陈慧娴 Female Version", 
    thumbnail: "https://img.youtube.com/vi/x2Kcwqxl2VU/mqdefault.jpg",
    duration: "4:28",
    youtubeId: "x2Kcwqxl2VU"
  },
  {
    id: "8",
    title: "光辉岁月 (伴奏版)",
    artist: "Beyond Karaoke",
    thumbnail: "https://img.youtube.com/vi/2_qqP1ABD5I/mqdefault.jpg",
    duration: "5:12",
    youtubeId: "2_qqP1ABD5I"
  }
];

export const searchSongs = (query: string, gender: string = "all"): Song[] => {
  if (!query.trim()) return [];
  
  let filtered = mockSongs.filter(song => 
    song.title.toLowerCase().includes(query.toLowerCase()) ||
    song.artist.toLowerCase().includes(query.toLowerCase())
  );
  
  if (gender === "male") {
    filtered = filtered.filter(song => 
      song.title.includes("男声") || song.artist.includes("Male")
    );
  } else if (gender === "female") {
    filtered = filtered.filter(song => 
      song.title.includes("女声") || song.artist.includes("Female")
    );
  }
  
  return filtered;
};