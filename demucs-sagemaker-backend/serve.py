#!/usr/bin/env python3
import os
import json
import subprocess
import traceback
from flask import Flask, request, jsonify
import boto3
from pathlib import Path
import shutil
import sys

app = Flask(__name__)

UPLOAD_DIR = "/tmp/uploads"
OUTPUT_DIR = "/tmp/output"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

s3_client = boto3.client("s3")


@app.route("/ping", methods=["GET"])
def ping():
    return jsonify({"status": "healthy"}), 200


@app.route("/invocations", methods=["POST"])
def invocations():
    try:
        data = json.loads(request.data.decode("utf-8"))
        input_s3_uri = data.get("input_s3_uri")
        output_s3_prefix = data.get("output_s3_prefix")
        session_id = data.get("session_id", "default")

        if not input_s3_uri or not output_s3_prefix:
            return jsonify({"error": "Missing input_s3_uri or output_s3_prefix"}), 400

        input_bucket, input_key = parse_s3_uri(input_s3_uri)
        output_bucket, output_prefix = parse_s3_uri(output_s3_prefix)

        input_filename = os.path.basename(input_key)
        local_input_path = os.path.join(UPLOAD_DIR, input_filename)

        print(f"Downloading {input_s3_uri} -> {local_input_path}")
        s3_client.download_file(input_bucket, input_key, local_input_path)

        print(f"Processing using Demucs for: {input_filename}")
        output_path = os.path.join(OUTPUT_DIR, session_id)
        os.makedirs(output_path, exist_ok=True)

        cmd = [
            sys.executable, "-m", "demucs.separate",
            "-n", "htdemucs",
            "--two-stems", "vocals",
            "--name", "htdemucs",
            "-o", output_path,
            local_input_path
        ]

        print("Command:", " ".join(cmd))
        result = subprocess.run(cmd, capture_output=True, text=True)

        print("STDOUT:", result.stdout)
        print("STDERR:", result.stderr)

        if result.returncode != 0:
            raise RuntimeError(f"Demucs failed\n{result.stderr}")

        separated_dir = os.path.join(
            output_path, "htdemucs", Path(input_filename).stem
        )

        if not os.path.exists(separated_dir):
            raise RuntimeError("Output not found. Demucs path may be wrong.")

        uploaded_files = []
        for filename in os.listdir(separated_dir):
            local_file = os.path.join(separated_dir, filename)
            s3_key = f"{output_prefix.rstrip('/')}/{session_id}/{filename}"
            print(f"Uploading {local_file} -> s3://{output_bucket}/{s3_key}")
            s3_client.upload_file(local_file, output_bucket, s3_key)

            uploaded_files.append(
                {"filename": filename, "s3_uri": f"s3://{output_bucket}/{s3_key}"}
            )

        cleanup_local_files(local_input_path, output_path)

        return jsonify({
            "status": "success",
            "session_id": session_id,
            "output_files": uploaded_files
        }), 200

    except Exception as e:
        error_msg = f"Error: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        return jsonify({"error": error_msg}), 500


def parse_s3_uri(uri):
    parts = uri.replace("s3://", "").split("/", 1)
    return parts[0], parts[1]


def cleanup_local_files(input_path, output_path):
    try:
        if os.path.exists(input_path):
            os.remove(input_path)
        if os.path.exists(output_path):
            shutil.rmtree(output_path)
        print("Cleaned up local files")
    except Exception as e:
        print(f"Cleanup failed: {e}")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=False)
