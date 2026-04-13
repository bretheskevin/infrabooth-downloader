use std::fs;
use tempfile::TempDir;

use crate::services::rekordbox::xml_sync::PlaylistXml;

const SAMPLE_XML: &str = r#"<?xml version="1.0" encoding="utf-8"?>
<PLAYLISTS Version="1.0" AutomaticSync="1">
<PRODUCT Version="7.0.9"/>
<PLAYLISTS>
<NODE Id="A1B2C" ParentId="0" Attribute="1" Timestamp="1712847022000" Lib_Type="0" CheckType="0"/>
</PLAYLISTS>
</PLAYLISTS>"#;

fn setup_xml_dir() -> TempDir {
    let tmp = TempDir::new().unwrap();
    fs::write(tmp.path().join("masterPlaylists6.xml"), SAMPLE_XML).unwrap();
    tmp
}

#[test]
fn test_read_playlist_xml() {
    let tmp = setup_xml_dir();
    let xml = PlaylistXml::read(tmp.path()).expect("Read failed");
    let playlists = xml.get_playlists();
    assert_eq!(playlists.len(), 1);
    assert_eq!(playlists[0].0, "A1B2C");
}

#[test]
fn test_read_if_exists_returns_none_for_missing_xml() {
    let tmp = TempDir::new().unwrap();
    let xml = PlaylistXml::read_if_exists(tmp.path()).expect("Optional read failed");
    assert!(xml.is_none());
}

#[test]
fn test_add_playlist_to_xml() {
    let tmp = setup_xml_dir();
    let mut xml = PlaylistXml::read(tmp.path()).expect("Read failed");
    assert!(xml.add_playlist("12345", "root", 0, 1712900000000));
    let playlists = xml.get_playlists();
    assert_eq!(playlists.len(), 2);
    assert!(playlists.iter().any(|(id, ..)| id == "3039"));
}

#[test]
fn test_remove_playlist_from_xml() {
    let tmp = setup_xml_dir();
    let mut xml = PlaylistXml::read(tmp.path()).expect("Read failed");
    xml.remove_playlist("662316").expect("Remove failed");
    let playlists = xml.get_playlists();
    assert_eq!(playlists.len(), 0);
}

#[test]
fn test_save_and_reload() {
    let tmp = setup_xml_dir();
    let mut xml = PlaylistXml::read(tmp.path()).expect("Read failed");
    assert!(xml.add_playlist("99999", "root", 1, 1712950000000));
    xml.save(tmp.path()).expect("Save failed");
    let reloaded = PlaylistXml::read(tmp.path()).expect("Reload failed");
    assert_eq!(reloaded.get_playlists().len(), 2);
}
