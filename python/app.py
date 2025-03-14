from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import os
import time
import uuid
import json
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*")

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

METADATA_FILE = 'uploads/metadata.json'

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  

def save_metadata(file_data):
    metadata = []
    if os.path.exists(METADATA_FILE):
        try:
            with open(METADATA_FILE, 'r') as f:
                metadata = json.load(f)
        except:
            metadata = []
    
    metadata.append(file_data)
    
    with open(METADATA_FILE, 'w') as f:
        json.dump(metadata, f)
    
    socketio.emit('file_uploaded', file_data)

def get_all_metadata():
    if os.path.exists(METADATA_FILE):
        try:
            with open(METADATA_FILE, 'r') as f:
                return json.load(f)
        except:
            return []
    return []

@app.route('/', methods=['GET'])
def health_check():
    return jsonify({
        "status": "success",
        "message": "Flask API berjalan dengan baik"
    })

@socketio.on('connect')
def handle_connect():
    print('Client connected')
    files = get_all_metadata()
    emit('files_list', files)

@socketio.on('get_files')
def handle_get_files():
    files = get_all_metadata()
    emit('files_list', files)

@socketio.on('upload_progress')
def handle_upload_progress(data):
    emit('upload_progress_update', data, broadcast=True)

@app.route('/api/upload', methods=['POST'])
def upload_file():
    start_time = time.time()
    
    if 'file' not in request.files:
        return jsonify({
            "status": "error",
            "message": "Tidak ada file yang dikirim"
        }), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({
            "status": "error",
            "message": "Nama file kosong"
        }), 400
    
    filename = secure_filename(file.filename)
    file_ext = os.path.splitext(filename.lower())[1]
    
    file_type = None
    content = None
    
    if file_ext == '.txt':
        file_type = 'text'
    elif file_ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
        file_type = 'image'
    elif file_ext in ['.mp4', '.mov', '.avi', '.webm']:
        file_type = 'video'
    else:
        return jsonify({
            "status": "error",
            "message": "Format file tidak didukung"
        }), 400
    
    file_size = 0
    chunk_size = 8192  
    progress_counter = 0
    progress_percentage = 0
    
    unique_filename = f"{uuid.uuid4()}_{filename}"
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
    
    with open(file_path, 'wb') as f:
        chunk = file.read(chunk_size)
        while chunk:
            f.write(chunk)
            file_size += len(chunk)
            progress_counter += 1
            
            if progress_counter % 10 == 0:
                total_size = request.content_length or file_size
                progress_percentage = min(int((file_size / total_size) * 100), 99)
                
                socketio.emit('upload_progress_update', {
                    'filename': filename,
                    'progress': progress_percentage
                })
            
            chunk = file.read(chunk_size)
    
    if file_type == 'text':
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except:
            content = "Tidak dapat membaca konten file teks"
    
    execution_time = time.time() - start_time
    
    file_data = {
        "id": str(uuid.uuid4()),
        "original_name": filename,
        "stored_name": unique_filename,
        "type": file_type,
        "size": os.path.getsize(file_path),
        "upload_time": time.strftime("%Y-%m-%d %H:%M:%S"),
        "execution_time": f"{execution_time:.4f} detik"
    }
    
    save_metadata(file_data)
    
    socketio.emit('upload_progress_update', {
        'filename': filename,
        'progress': 100
    })
    
    return jsonify({
        "status": "success",
        "message": f"File {file_type} berhasil diunggah",
        "file_data": file_data,
        "content": content,
        "file_url": f"/api/files/{unique_filename}",
        "execution_time": f"{execution_time:.4f} detik"
    })

@app.route('/api/files', methods=['GET'])
def get_files():
    metadata = get_all_metadata()
    return jsonify({
        "status": "success",
        "data": metadata
    })

@app.route('/api/files/<filename>', methods=['GET'])
def get_file(filename):
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if os.path.exists(file_path):
        return send_file(file_path)
    return jsonify({
        "status": "error",
        "message": "File tidak ditemukan"
    }), 404

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, allow_unsafe_werkzeug=True)