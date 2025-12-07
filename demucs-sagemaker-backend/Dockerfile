# SageMaker-compatible Dockerfile for Demucs
FROM nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3-pip \
    ffmpeg \
    libsndfile1 \
    git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /opt/ml/code

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Install demucs
RUN pip3 install --no-cache-dir demucs

# Copy the inference server
COPY serve.py .
RUN chmod +x serve.py

# Create necessary directories
RUN mkdir -p /tmp/uploads /tmp/output

# Expose port for SageMaker
EXPOSE 8080

# Set the inference server as entrypoint
ENTRYPOINT ["python3", "serve.py"]