FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=5052
ENV SCRAPER_SERVICE_URL=https://scraper-service-907s.onrender.com

EXPOSE 5052

CMD ["gunicorn", "--bind", "0.0.0.0:5052", "app:app"]