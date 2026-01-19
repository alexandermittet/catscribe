FROM python:3.11-slim

# Install system dependencies for Whisper and ffmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install CPU-only PyTorch first (much smaller, ~800MB vs 2.5GB)
# faster-whisper uses CTranslate2 which is compatible with CPU-only PyTorch
RUN pip install --no-cache-dir torch==2.3.1 --index-url https://download.pytorch.org/whl/cpu

# Copy requirements and install remaining Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Create data directory for models and transcriptions
RUN mkdir -p /data/whisper_models /data/transcriptions

# Set environment variables
ENV XDG_CACHE_HOME=/data
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
