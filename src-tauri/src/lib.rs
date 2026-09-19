mod file_ops;
mod fs_index;
mod types;
mod zip_index;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            fs_index::index_folder,
            fs_index::index_files,
            zip_index::index_zip,
            zip_index::read_zip_entry_bytes,
            zip_index::read_zip_entry_text,
            zip_index::hash_zip_entry,
            file_ops::read_file_bytes,
            file_ops::read_file_text,
            file_ops::hash_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
