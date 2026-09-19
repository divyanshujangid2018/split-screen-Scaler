use base64::{engine::general_purpose::STANDARD, Engine as _};
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::Read;

#[tauri::command]
pub fn read_file_bytes(path: String, max_bytes: Option<u64>) -> Result<String, String> {
    let mut file = File::open(&path).map_err(|e| format!("cannot open file: {}", e))?;
    let limit = max_bytes.unwrap_or(u64::MAX);
    let mut buf = Vec::new();
    file.by_ref()
        .take(limit)
        .read_to_end(&mut buf)
        .map_err(|e| format!("read failed: {}", e))?;
    Ok(STANDARD.encode(buf))
}

#[tauri::command]
pub fn read_file_text(path: String, max_bytes: Option<u64>) -> Result<String, String> {
    let mut file = File::open(&path).map_err(|e| format!("cannot open file: {}", e))?;
    let limit = max_bytes.unwrap_or(2_000_000);
    let mut buf = Vec::new();
    file.by_ref()
        .take(limit)
        .read_to_end(&mut buf)
        .map_err(|e| format!("read failed: {}", e))?;
    Ok(String::from_utf8_lossy(&buf).to_string())
}

/// Streaming SHA-256 over a file on disk - never loads the whole file into memory at once.
#[tauri::command]
pub fn hash_file(path: String) -> Result<String, String> {
    let mut file = File::open(&path).map_err(|e| format!("cannot open file: {}", e))?;
    let mut hasher = Sha256::new();
    let mut buf = [0u8; 65536];
    loop {
        let n = file.read(&mut buf).map_err(|e| format!("read failed: {}", e))?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}
