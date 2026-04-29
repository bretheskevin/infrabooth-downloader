use std::fs;
use std::path::Path;

use quick_xml::events::{BytesStart, Event};
use quick_xml::Reader;

use super::models::MASTER_PLAYLISTS_XML;
use crate::models::error::RekordboxError;

pub struct PlaylistXml {
    document: XmlDocument,
    modified: bool,
}

struct XmlDocument {
    before_inner: String,
    segments: Vec<InnerSegment>,
    after_inner: String,
}

enum InnerSegment {
    Raw(String),
    Node(XmlNode),
}

struct XmlNode {
    id: String,
    parent_id: String,
    attribute: String,
    timestamp: String,
    lib_type: String,
    check_type: String,
}

impl PlaylistXml {
    pub fn read_if_exists(db_dir: &Path) -> Result<Option<Self>, RekordboxError> {
        let xml_path = db_dir.join(MASTER_PLAYLISTS_XML);
        if !xml_path.exists() {
            return Ok(None);
        }

        Self::read(db_dir).map(Some)
    }

    pub fn read(db_dir: &Path) -> Result<Self, RekordboxError> {
        let xml_path = db_dir.join(MASTER_PLAYLISTS_XML);
        let content = fs::read_to_string(&xml_path).map_err(|e| RekordboxError::XmlError(format!("Cannot read XML: {}", e)))?;
        let document = XmlDocument::parse(&content)?;

        Ok(Self { document, modified: false })
    }

    #[cfg(test)]
    pub fn get_playlists(&self) -> Vec<(String, String, String, String)> {
        self.document
            .segments
            .iter()
            .filter_map(|segment| match segment {
                InnerSegment::Node(n) => Some((n.id.clone(), n.parent_id.clone(), n.attribute.clone(), n.timestamp.clone())),
                InnerSegment::Raw(_) => None,
            })
            .collect()
    }

    pub fn add_playlist(&mut self, playlist_id: &str, parent_id: &str, attribute: i32, timestamp_ms: i64) -> bool {
        let hex_id = decimal_to_hex(playlist_id);
        if self.document.segments.iter().any(|segment| matches!(segment, InnerSegment::Node(n) if n.id == hex_id)) {
            return false;
        }

        let parent_hex = if parent_id == "root" {
            "0".to_string()
        } else {
            decimal_to_hex(parent_id)
        };

        let node = XmlNode {
            id: hex_id,
            parent_id: parent_hex,
            attribute: attribute.to_string(),
            timestamp: timestamp_ms.to_string(),
            lib_type: "0".to_string(),
            check_type: "0".to_string(),
        };
        self.document.push_node(node);
        self.modified = true;
        true
    }

    pub fn remove_playlist(&mut self, playlist_id: &str) -> Result<(), RekordboxError> {
        let hex_id = decimal_to_hex(playlist_id);
        let removed = self.document.remove_node(&hex_id);
        if !removed {
            return Err(RekordboxError::XmlError(format!("Playlist {} ({}) not found in XML", playlist_id, hex_id)));
        }
        self.modified = true;
        Ok(())
    }

    pub fn save(&self, db_dir: &Path) -> Result<(), RekordboxError> {
        if !self.modified {
            log::info!("[rekordbox-xml] No modifications, skipping save");
            return Ok(());
        }

        let xml_path = db_dir.join(MASTER_PLAYLISTS_XML);
        log::info!("[rekordbox-xml] Saving XML to: {:?}", xml_path);

        let output = self.document.render();
        log::info!("[rekordbox-xml] Rendered XML: {} bytes, {} segments", output.len(), self.document.segments.len());

        fs::write(&xml_path, &output).map_err(|e| {
            log::error!("[rekordbox-xml] Failed to write XML: {}", e);
            RekordboxError::XmlError(format!("Cannot write XML: {}", e))
        })?;
        log::info!("[rekordbox-xml] Saved {} successfully", MASTER_PLAYLISTS_XML);
        Ok(())
    }
}

impl XmlDocument {
    fn parse(content: &str) -> Result<Self, RekordboxError> {
        let (before_inner, inner_content, after_inner) = split_playlists_section(content)?;
        let segments = parse_inner_segments(inner_content)?;
        Ok(Self { before_inner: before_inner.to_string(), segments, after_inner: after_inner.to_string() })
    }

    fn push_node(&mut self, node: XmlNode) {
        // Insert before the last non-empty raw segment (trailing whitespace) to preserve XML formatting
        let insert_at = self
            .segments
            .iter()
            .rposition(|segment| matches!(segment, InnerSegment::Raw(raw) if !raw.trim().is_empty()))
            .filter(|idx| matches!(self.segments[*idx], InnerSegment::Raw(_)))
            .unwrap_or(self.segments.len());

        if insert_at == self.segments.len() {
            self.segments.push(InnerSegment::Node(node));
        } else {
            self.segments.insert(insert_at, InnerSegment::Node(node));
        }
    }

    fn remove_node(&mut self, id: &str) -> bool {
        let initial_len = self.segments.len();
        self.segments.retain(|segment| !matches!(segment, InnerSegment::Node(node) if node.id == id));
        self.segments.len() != initial_len
    }

    fn render(&self) -> String {
        let mut output = String::with_capacity(self.before_inner.len() + self.after_inner.len() + (self.segments.len() * 80));
        output.push_str(&self.before_inner);
        for segment in &self.segments {
            match segment {
                InnerSegment::Raw(raw) => output.push_str(raw),
                InnerSegment::Node(node) => output.push_str(&render_node(node)),
            }
        }
        output.push_str(&self.after_inner);
        output
    }
}

fn parse_node_attributes(e: &BytesStart) -> Result<XmlNode, RekordboxError> {
    let mut id = String::new();
    let mut parent_id = String::new();
    let mut attribute = String::new();
    let mut timestamp = String::new();
    let mut lib_type = String::new();
    let mut check_type = String::new();

    for attr in e.attributes().flatten() {
        let key = std::str::from_utf8(attr.key.as_ref()).unwrap_or("");
        let val = attr.unescape_value().unwrap_or_default().to_string();
        match key {
            "Id" => id = val,
            "ParentId" => parent_id = val,
            "Attribute" => attribute = val,
            "Timestamp" => timestamp = val,
            "Lib_Type" => lib_type = val,
            "CheckType" => check_type = val,
            _ => {}
        }
    }

    if id.is_empty() {
        return Err(RekordboxError::XmlError("NODE element missing required Id attribute".into()));
    }

    Ok(XmlNode { id, parent_id, attribute, timestamp, lib_type, check_type })
}

fn split_playlists_section(content: &str) -> Result<(&str, &str, &str), RekordboxError> {
    let open_start =
        content.find("<PLAYLISTS>").or_else(|| content.find("<PLAYLISTS ")).ok_or_else(|| RekordboxError::XmlError("Missing PLAYLISTS tag".into()))?;
    let open_end = content[open_start..].find('>').map(|idx| open_start + idx + 1).ok_or_else(|| RekordboxError::XmlError("Malformed PLAYLISTS tag".into()))?;
    let close_start =
        content[open_end..].find("</PLAYLISTS>").map(|idx| open_end + idx).ok_or_else(|| RekordboxError::XmlError("Missing PLAYLISTS closing tag".into()))?;

    Ok((&content[..open_end], &content[open_end..close_start], &content[close_start..]))
}

fn parse_inner_segments(inner_content: &str) -> Result<Vec<InnerSegment>, RekordboxError> {
    let mut segments = Vec::new();
    let mut cursor = 0usize;

    while let Some(relative_idx) = inner_content[cursor..].find("<NODE") {
        let start = cursor + relative_idx;
        let end = inner_content[start..].find("/>").map(|idx| start + idx + 2).ok_or_else(|| RekordboxError::XmlError("Malformed NODE element".into()))?;

        if start > cursor {
            segments.push(InnerSegment::Raw(inner_content[cursor..start].to_string()));
        }

        let raw_node = &inner_content[start..end];
        if raw_node.contains("</NODE>") {
            segments.push(InnerSegment::Raw(raw_node.to_string()));
        } else {
            let mut reader = Reader::from_str(raw_node);
            match reader.read_event() {
                Ok(Event::Empty(ref e)) if e.name().as_ref() == b"NODE" => {
                    segments.push(InnerSegment::Node(parse_node_attributes(e)?));
                }
                _ => segments.push(InnerSegment::Raw(raw_node.to_string())),
            }
        }

        cursor = end;
    }

    if cursor < inner_content.len() {
        segments.push(InnerSegment::Raw(inner_content[cursor..].to_string()));
    }

    Ok(segments)
}

fn render_node(node: &XmlNode) -> String {
    format!(
        "<NODE Id=\"{}\" ParentId=\"{}\" Attribute=\"{}\" Timestamp=\"{}\" Lib_Type=\"{}\" CheckType=\"{}\"/>\n",
        escape_xml_attr(&node.id),
        escape_xml_attr(&node.parent_id),
        escape_xml_attr(&node.attribute),
        escape_xml_attr(&node.timestamp),
        escape_xml_attr(&node.lib_type),
        escape_xml_attr(&node.check_type)
    )
}

fn decimal_to_hex(decimal_str: &str) -> String {
    decimal_str.parse::<i64>().map(|n| format!("{:X}", n)).unwrap_or_else(|_| decimal_str.to_string())
}

fn escape_xml_attr(s: &str) -> String {
    s.replace('&', "&amp;").replace('"', "&quot;").replace('<', "&lt;").replace('>', "&gt;")
}
