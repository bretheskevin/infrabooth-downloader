export interface UserInfo {
  username: string;
}

export interface TrackInfo {
  id: number;
  title: string;
  user: UserInfo;
  artwork_url: string | null;
  duration: number;
}

export interface PlaylistInfo {
  id: number;
  title: string;
  user: UserInfo;
  artwork_url: string | null;
  track_count: number;
  tracks: TrackInfo[];
}
