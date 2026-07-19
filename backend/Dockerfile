# Use a slim Python 3.13 image
FROM python:3.13-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

# Set work directory
WORKDIR /app

# Install system dependencies (if any needed for compiling libraries, though wheels should be available)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . /app/

# Expose port (for FastAPI)
EXPOSE 8000

# Default command (can be overridden during deployment)
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
