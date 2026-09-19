use crate::types::{IndexResult, RawFileEntry};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::{BufReader, Read};
use std::path::Path;
use zip::ZipArchive;

fn extension_of(name: &str) -> String {
    Path::new(name)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase()
}

fn open_archive(zip_path: &str) -> Result<ZipArchive<BufReader<File>>, String> {
    let file = File::open(zip_path).map_err(|e| format!("cannot open zip: {}", e))?;
    let reader = BufReader::new(file);
    ZipArchive::new(reader).map_err(|e| format!("corrupt or unsupported zip: {}", e))
}

/// List a zip archive's entries by reading only its central directory - the archive is
/// never fully extracted.
#[tauri::command]
pub fn index_zip(zip_path: String) -> IndexResult {
    let mut files = Vec::new();
    let mut errors = Vec::new();

    match open_archive(&zip_path) {
        Ok(mut archive) => {
            for i in 0..archive.len() {
                match archive.by_index(i) {
                    Ok(entry) => {
                        if entry.is_dir() {
                            continue;
                        }
                        let rel = entry.name().replace('\\', "/");
                        let name = Path::new(&rel)
                            .file_name()
                            .map(|n| n.to_string_lossy().to_string())
                            .unwrap_or_else(|| rel.clone());
                        let modified_at = entry
                            .last_modified()
                            .and_then(|dt| time::OffsetDateTime::try_from(dt).ok())
                            .map(|t| t.unix_timestamp() * 1000);
                        files.push(RawFileEntry {
                            relative_path: rel,
                            extension: extension_of(&name),
                            name,
                            size: entry.size(),
                            modified_at,
                            abs_path: String::new(),
                        });
                    }
                    Err(e) => errors.push(format!("entry {}: {}", i, e)),
                }
            }
        }
        Err(e) => errors.push(e),
    }

    IndexResult { files, errors }
}

/// Read a single zip entry's bytes (base64-encoded for IPC transfer), without touching
/// any other entry in the archive.
#[tauri::command]
pub fn read_zip_entry_bytes(zip_path: String, entry_name: String, max_bytes: Option<u64>) -> Result<String, String> {
    let mut archive = open_archive(&zip_path)?;
    let mut entry = archive
        .by_name(&entry_name)
        .map_err(|e| format!("entry not found: {}", e))?;
    let limit = max_bytes.unwrap_or(u64::MAX);
    let mut buf = Vec::new();
    entry
        .by_ref()
        .take(limit)
        .read_to_end(&mut buf)
        .map_err(|e| format!("read failed: {}", e))?;
    Ok(STANDARD.encode(buf))
}

#[tauri::command]
pub fn read_zip_entry_text(zip_path: String, entry_name: String, max_bytes: Option<u64>) -> Result<String, String> {
    let mut archive = open_archive(&zip_path)?;
    let mut entry = archive
        .by_name(&entry_name)
        .map_err(|e| format!("entry not found: {}", e))?;
    let limit = max_bytes.unwrap_or(2_000_000);
    let mut buf = Vec::new();
    entry
        .by_ref()
        .take(limit)
        .read_to_end(&mut buf)
        .map_err(|e| format!("read failed: {}", e))?;
    Ok(String::from_utf8_lossy(&buf).to_string())
}

#[tauri::command]
pub fn hash_zip_entry(zip_path: String, entry_name: String) -> Result<String, String> {
    let mut archive = open_archive(&zip_path)?;
    let mut entry = archive
        .by_name(&entry_name)
        .map_err(|e| format!("entry not found: {}", e))?;
    let mut hasher = Sha256::new();
    let mut buf = [0u8; 65536];
    loop {
        let n = entry.read(&mut buf).map_err(|e| format!("read failed: {}", e))?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}
