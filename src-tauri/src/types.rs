use serde::{Deserialize, Serialize};

/// Metadata for a single file, whether it lives on disk directly or inside a zip archive.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawFileEntry {
    /// Path relative to the dataset root (folder root, or the flat file list, or the zip root).
    pub relative_path: String,
    pub name: String,
    pub extension: String,
    pub size: u64,
    /// Unix ms, when available.
    pub modified_at: Option<i64>,
    /// Absolute path on disk for folder/file datasets. Empty for zip entries (use zip_path + relative_path).
    pub abs_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexResult {
    pub files: Vec<RawFileEntry>,
    pub errors: Vec<String>,
}
