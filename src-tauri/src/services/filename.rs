const UNSAFE_CHARS: &[char] = &['/', '\\', ':', '*', '?', '"', '<', '>', '|'];

pub fn sanitize_path_component(s: &str) -> String {
    s.chars()
        .map(|c| if UNSAFE_CHARS.contains(&c) || c.is_control() { '_' } else { c })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_replaces_special_chars() {
        assert_eq!(sanitize_path_component("Artist/Name"), "Artist_Name");
        assert_eq!(sanitize_path_component("Title:Test?"), "Title_Test_");
        assert_eq!(sanitize_path_component("a<b>c|d"), "a_b_c_d");
    }

    #[test]
    fn test_replaces_control_chars() {
        assert_eq!(sanitize_path_component("Artist\x00Name"), "Artist_Name");
        assert_eq!(sanitize_path_component("Title\nTest"), "Title_Test");
    }

    #[test]
    fn test_preserves_normal_text() {
        assert_eq!(sanitize_path_component("Normal Title"), "Normal Title");
        assert_eq!(sanitize_path_component("Bartholomé - Track"), "Bartholomé - Track");
    }
}
