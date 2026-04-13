use rusqlite::Connection;
use tempfile::TempDir;

use crate::services::rekordbox::database::RekordboxDatabase;

pub fn setup_test_db() -> (TempDir, RekordboxDatabase) {
    let tmp_dir = TempDir::new().expect("Failed to create temp dir");
    let db_path = tmp_dir.path().join("master.db");

    let conn = Connection::open(&db_path).expect("Failed to create test DB");
    create_schema(&conn);
    seed_data(&conn);
    drop(conn);

    let db = RekordboxDatabase::open_unencrypted(&db_path, tmp_dir.path().to_path_buf())
        .expect("Failed to open test DB");
    (tmp_dir, db)
}

fn create_schema(conn: &Connection) {
    conn.execute_batch(
        "
        CREATE TABLE agentRegistry (
            registry_id VARCHAR(255) PRIMARY KEY,
            id_1 VARCHAR(255), id_2 VARCHAR(255),
            int_1 INTEGER, int_2 INTEGER,
            str_1 VARCHAR(255), str_2 VARCHAR(255),
            date_1 TEXT, date_2 TEXT,
            text_1 TEXT, text_2 TEXT,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE djmdDevice (
            ID VARCHAR(255) PRIMARY KEY, MasterDBID VARCHAR(255), Name VARCHAR(255),
            rb_data_status INTEGER DEFAULT 0, rb_local_data_status INTEGER DEFAULT 0,
            rb_local_deleted INTEGER DEFAULT 0, rb_local_synced INTEGER DEFAULT 0,
            usn INTEGER, rb_local_usn INTEGER,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE djmdMenuItems (
            ID VARCHAR(255) PRIMARY KEY, Class INTEGER, Name VARCHAR(255), UUID VARCHAR(255),
            rb_data_status INTEGER DEFAULT 0, rb_local_data_status INTEGER DEFAULT 0,
            rb_local_deleted INTEGER DEFAULT 0, rb_local_synced INTEGER DEFAULT 0,
            usn INTEGER, rb_local_usn INTEGER,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE djmdArtist (
            ID VARCHAR(255) PRIMARY KEY, Name VARCHAR(255), UUID VARCHAR(255),
            rb_data_status INTEGER DEFAULT 0, rb_local_data_status INTEGER DEFAULT 0,
            rb_local_deleted INTEGER DEFAULT 0, rb_local_synced INTEGER DEFAULT 0,
            usn INTEGER, rb_local_usn INTEGER,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE djmdAlbum (
            ID VARCHAR(255) PRIMARY KEY, Name VARCHAR(255), UUID VARCHAR(255),
            AlbumArtistID VARCHAR(255), ImagePath VARCHAR(255),
            rb_data_status INTEGER DEFAULT 0, rb_local_data_status INTEGER DEFAULT 0,
            rb_local_deleted INTEGER DEFAULT 0, rb_local_synced INTEGER DEFAULT 0,
            usn INTEGER, rb_local_usn INTEGER,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE djmdContent (
            ID VARCHAR(255) PRIMARY KEY, UUID VARCHAR(255), FolderPath VARCHAR(255),
            FileNameL VARCHAR(255), FileNameS VARCHAR(255), Title VARCHAR(255),
            ArtistID VARCHAR(255), AlbumID VARCHAR(255), GenreID VARCHAR(255),
            BPM INTEGER, Length INTEGER, TrackNo INTEGER,
            BitRate INTEGER, BitDepth INTEGER, Commnt TEXT,
            FileType INTEGER, Rating INTEGER, ReleaseYear INTEGER,
            RemixerID VARCHAR(255), LabelID VARCHAR(255), OrgArtistID VARCHAR(255),
            KeyID VARCHAR(255), StockDate VARCHAR(255), ColorID VARCHAR(255),
            DJPlayCount VARCHAR(255), ImagePath VARCHAR(255),
            MasterDBID VARCHAR(255), MasterSongID VARCHAR(255),
            AnalysisDataPath VARCHAR(255), SearchStr VARCHAR(255),
            FileSize INTEGER, DiscNo INTEGER, ComposerID VARCHAR(255),
            Subtitle VARCHAR(255), SampleRate INTEGER,
            DisableQuantize INTEGER, Analysed INTEGER,
            ReleaseDate VARCHAR(255), DateCreated VARCHAR(255),
            ContentLink INTEGER, Tag VARCHAR(255),
            ModifiedByRBM VARCHAR(255), HotCueAutoLoad VARCHAR(255),
            DeliveryControl VARCHAR(255), DeliveryComment VARCHAR(255),
            CueUpdated VARCHAR(255), AnalysisUpdated VARCHAR(255),
            TrackInfoUpdated VARCHAR(255), Lyricist VARCHAR(255),
            ISRC VARCHAR(255), SamplerTrackInfo INTEGER,
            SamplerPlayOffset INTEGER, SamplerGain REAL,
            VideoAssociate VARCHAR(255), LyricStatus INTEGER,
            ServiceID INTEGER, OrgFolderPath VARCHAR(255),
            Reserved1 TEXT, Reserved2 TEXT, Reserved3 TEXT, Reserved4 TEXT,
            ExtInfo TEXT, rb_file_id VARCHAR(255), DeviceID VARCHAR(255),
            rb_LocalFolderPath VARCHAR(255),
            SrcID VARCHAR(255), SrcTitle VARCHAR(255),
            SrcArtistName VARCHAR(255), SrcAlbumName VARCHAR(255), SrcLength INTEGER,
            rb_data_status INTEGER DEFAULT 0, rb_local_data_status INTEGER DEFAULT 0,
            rb_local_deleted INTEGER DEFAULT 0, rb_local_synced INTEGER DEFAULT 0,
            usn INTEGER, rb_local_usn INTEGER,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE djmdPlaylist (
            ID VARCHAR(255) PRIMARY KEY, UUID VARCHAR(255), Seq INTEGER,
            Name VARCHAR(255), ImagePath VARCHAR(255), Attribute INTEGER,
            ParentID VARCHAR(255), SmartList TEXT,
            rb_data_status INTEGER DEFAULT 0, rb_local_data_status INTEGER DEFAULT 0,
            rb_local_deleted INTEGER DEFAULT 0, rb_local_synced INTEGER DEFAULT 0,
            usn INTEGER, rb_local_usn INTEGER,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE djmdSongPlaylist (
            ID VARCHAR(255) PRIMARY KEY, PlaylistID VARCHAR(255), ContentID VARCHAR(255),
            TrackNo INTEGER, UUID VARCHAR(255),
            rb_data_status INTEGER DEFAULT 0, rb_local_data_status INTEGER DEFAULT 0,
            rb_local_deleted INTEGER DEFAULT 0, rb_local_synced INTEGER DEFAULT 0,
            usn INTEGER, rb_local_usn INTEGER,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
    ",
    )
    .expect("Failed to create schema");
}

fn seed_data(conn: &Connection) {
    let now = "2026-04-11 12:00:00.000 +00:00";
    conn.execute_batch(&format!(
        "
        INSERT INTO agentRegistry (registry_id, int_1, created_at, updated_at)
        VALUES ('localUpdateCount', 1000, '{now}', '{now}');
        INSERT INTO djmdDevice (ID, MasterDBID, Name, created_at, updated_at)
        VALUES ('1', 'MASTERDB001', 'TestDevice', '{now}', '{now}');
        INSERT INTO djmdMenuItems (ID, Class, Name, UUID, rb_local_usn, created_at, updated_at)
        VALUES ('1', 0, 'TRACK', 'menu-uuid-1', 100, '{now}', '{now}');
    "
    ))
    .expect("Failed to seed data");
}
