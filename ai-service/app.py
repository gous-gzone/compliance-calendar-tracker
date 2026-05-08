from flask import Flask, request, jsonify
import os
import json
import time
from collections import deque
from dotenv import load_dotenv
from groq import Groq

# Chroma
from services.chroma_service import ChromaService

# -----------------------------
# INIT
# -----------------------------
app = Flask(__name__)

load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env'))

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
chroma = ChromaService()

# -----------------------------
# METRICS (Day 7)
# -----------------------------
response_times = deque(maxlen=10)
start_time = time.time()

cache_hits = 0
cache_misses = 0

MODEL_NAME = "llama-3.1-8b-instant"

# -----------------------------
# ROUTES
# -----------------------------
@app.route("/")
def home():
    return "AI Chatbot Running"


# -----------------------------
# CHAT (existing)
# -----------------------------
@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()

    if not data or "message" not in data:
        return jsonify({"error": "No message provided"}), 400

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": data["message"]}]
        )

        return jsonify({
            "reply": response.choices[0].message.content
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -----------------------------
# QUERY (Day 5)
# -----------------------------
@app.route("/query", methods=["POST"])
def query():
    global cache_hits, cache_misses

    start = time.time()

    data = request.get_json()
    question = data.get("question")

    if not question:
        return jsonify({"error": "Question is required"}), 400

    # Retrieve docs
    docs = chroma.query(question, top_k=3)

    if docs:
        cache_hits += 1
    else:
        cache_misses += 1
        return jsonify({
            "answer": "No relevant data found",
            "sources": []
        })

    context = "\n".join(docs)

    prompt = f"""
Use the context below to answer.

Context:
{context}

Question:
{question}
"""

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}]
        )

        answer = response.choices[0].message.content

        # Track response time
        end = time.time()
        response_times.append(end - start)

        return jsonify({
            "answer": answer,
            "sources": docs
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -----------------------------
# HEALTH (Day 7)
# -----------------------------
@app.route("/health", methods=["GET"])
def health():
    avg_response_time = (
        sum(response_times) / len(response_times)
        if response_times else 0
    )

    uptime = time.time() - start_time

    try:
        doc_count = chroma.collection.count()
    except:
        doc_count = 0

    return jsonify({
        "status": "healthy",
        "model": MODEL_NAME,
        "avg_response_time": round(avg_response_time, 4),
        "uptime_seconds": int(uptime),
        "chroma_doc_count": doc_count,
        "cache": {
            "hits": cache_hits,
            "misses": cache_misses
        }
    })


# -----------------------------
# RUN
# -----------------------------
if __name__ == "__main__":
    app.run(debug=True)