"""
CampusBot - AI College FAQ Assistant
Flask backend that answers student questions using a predefined FAQ
knowledge base as grounding context for a Groq-hosted Llama model.
"""

import os
import json
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

load_dotenv()

try:
    from groq import Groq
except ImportError:
    Groq = None

app = Flask(__name__)

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

groq_client = Groq(api_key=GROQ_API_KEY) if (Groq and GROQ_API_KEY) else None

FAQ_PATH = os.path.join(os.path.dirname(__file__), "faq.json")


def load_faq():
    """Load the FAQ knowledge base from disk."""
    with open(FAQ_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def build_context(faq_items):
    """Turn the FAQ list into a compact text block for the system prompt."""
    lines = []
    for item in faq_items:
        category = item.get("category", "General")
        lines.append(f"[{category}] Q: {item['question']}\nA: {item['answer']}")
    return "\n\n".join(lines)


SYSTEM_PROMPT_TEMPLATE = """You are CampusBot, an AI College Assistant.

Answer ONLY using the college information provided below. Do not invent facts,
names, dates, or numbers that are not present in the context.

If the answer is not available in the context, politely respond exactly with:
"I couldn't find that information. Please contact the college office."

Keep answers short (2-4 sentences), friendly, and helpful. Do not mention that
you are using a knowledge base or context; just answer naturally as CampusBot.

--- COLLEGE INFORMATION ---
{context}
--- END COLLEGE INFORMATION ---
"""

STOPWORDS = {
    "a", "an", "the", "is", "are", "what", "when", "where", "who", "how",
    "can", "do", "does", "i", "my", "for", "to", "of", "in", "on", "at",
    "and", "or", "with", "please", "tell", "me", "about", "there", "it",
    "will", "be", "get", "have", "has", "you", "your",
}


def _keywords(text):
    return {w for w in text.lower().replace("?", "").split() if w not in STOPWORDS}


def fallback_answer(question, faq_items):
    """Very simple keyword-overlap fallback used when no Groq API key is set,
    so the app is still testable/demoable without an API key."""
    question_keywords = _keywords(question)
    if not question_keywords:
        return "I couldn't find that information. Please contact the college office."

    best_match = None
    best_score = 0
    for item in faq_items:
        item_keywords = _keywords(item["question"])
        overlap = len(item_keywords.intersection(question_keywords))
        if overlap > best_score:
            best_score = overlap
            best_match = item

    # Require at least 2 meaningful shared keywords (or 1 if the question is very short)
    threshold = 1 if len(question_keywords) <= 2 else 2
    if best_match and best_score >= threshold:
        return best_match["answer"]
    return "I couldn't find that information. Please contact the college office."


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    user_question = (data.get("message") or "").strip()

    if not user_question:
        return jsonify({"error": "Message is required."}), 400

    faq_items = load_faq()

    # If no Groq API key is configured, use a lightweight local fallback
    # so the demo still works out of the box.
    if not groq_client:
        answer = fallback_answer(user_question, faq_items)
        return jsonify({"answer": answer, "source": "fallback"})

    context = build_context(faq_items)
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(context=context)

    try:
        completion = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_question},
            ],
            temperature=0.3,
            max_tokens=300,
        )
        answer = completion.choices[0].message.content.strip()
        return jsonify({"answer": answer, "source": "groq"})
    except Exception as exc:  # noqa: BLE001
        # Graceful degradation: fall back to keyword matching if the API call fails
        answer = fallback_answer(user_question, faq_items)
        return jsonify(
            {
                "answer": answer,
                "source": "fallback",
                "warning": f"Groq API error, used fallback: {str(exc)}",
            }
        )


@app.route("/api/suggestions")
def suggestions():
    """Return a handful of example questions for the UI's quick-suggestion chips."""
    faq_items = load_faq()
    sample = [item["question"] for item in faq_items[:6]]
    return jsonify({"suggestions": sample})


if __name__ == "__main__":
    app.run(debug=True, port=5000)