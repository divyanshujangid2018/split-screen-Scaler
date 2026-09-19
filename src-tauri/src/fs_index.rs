use crate::types::{IndexResult, RawFileEntry};
use std::path::Path;
use std::time::UNIX_EPOCH;
use walkdir::WalkDir;

fn extension_of(name: &str) -> String {
    Path::new(name)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase()
}

fn modified_ms(meta: &std::fs::Metadata) -> Option<i64> {
    meta.modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as i64)
}

/// Recursively index a folder. Never aborts on a single bad entry - errors are collected
/// and returned alongside whatever files were successfully read.
#[tauri::command]
pub fn index_folder(root: String) -> IndexResult {
    let root_path = Path::new(&root);
    let mut files = Vec::new();
    let mut errors = Vec::new();

    let walker = WalkDir::new(root_path).follow_links(false).into_iter();
    for entry in walker.filter_map(|e| e.ok()) {
        if !entry.file_type().is_file() {
            continue;
        }
        let path = entry.path();
        match path.metadata() {
            Ok(meta) => {
                let rel = path
                    .strip_prefix(root_path)
                    .unwrap_or(path)
                    .to_string_lossy()
                    .replace('\\', "/");
                let name = path
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();
                files.push(RawFileEntry {
                    relative_path: rel,
                    extension: extension_of(&name),
                    name,
                    size: meta.len(),
                    modified_at: modified_ms(&meta),
                    abs_path: path.to_string_lossy().to_string(),
                });
            }
            Err(e) => errors.push(format!("{}: {}", path.display(), e)),
        }
    }

    IndexResult { files, errors }
}

/// Index a flat list of individually-picked files (no shared folder root).
#[tauri::command]
pub fn index_files(paths: Vec<String>) -> IndexResult {
    let mut files = Vec::new();
    let mut errors = Vec::new();

    for p in paths {
        let path = Path::new(&p);
        match path.metadata() {
            Ok(meta) => {
                let name = path
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();
                files.push(RawFileEntry {
                    relative_path: name.clone(),
                    extension: extension_of(&name),
                    name,
                    size: meta.len(),
                    modified_at: modified_ms(&meta),
                    abs_path: path.to_string_lossy().to_string(),
                });
            }
            Err(e) => errors.push(format!("{}: {}", p, e)),
        }
    }

    IndexResult { files, errors }
}
