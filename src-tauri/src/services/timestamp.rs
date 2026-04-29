pub fn parse_iso_timestamp(s: &str) -> Option<i64> {
    time::OffsetDateTime::parse(s, &time::format_description::well_known::Rfc3339).ok().map(|dt| dt.unix_timestamp())
}
