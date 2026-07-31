# 🤖 CampusBot — AI College FAQ Assistant

A simple AI chatbot built in a day to answer common student questions about admissions, placements, clubs, hostel, library, fees, and academic rules — powered by Groq's Llama model and grounded in a custom FAQ database.

> 🕐 **Built in a day** as a quick MVP to solve a real problem: students repeatedly asking the same questions that are already documented somewhere.

## Features
- Ask questions in natural language
- Answers grounded in official college FAQ data
- Falls back to "contact college office" if info isn't available
- Works even without an API key (demo mode)
- Bonus: voice input, dark mode, chat history, PDF export, feedback buttons

## Tech Stack
- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Python (Flask)
- **AI:** Groq API (Llama 3.3)
- **Data:** JSON file (`faq.json`)

## How It Works

```
Student
  |
  v
Frontend (HTML/CSS/JS chat UI)
  |
  v
Flask Backend
  |
  v
Load faq.json
  |
  v
Send Question + Context to Groq API
  |
  v
AI Response
  |
  v
Display Answer
```

## Project Structure

college-chatbot/
│
├── app.py              # Flask backend + Groq integration
├── faq.json             # College knowledge base
├── requirements.txt      # Python dependencies
├── .env                  # API key (not committed)
│
├── templates/
│   └── index.html        # Chat UI
│
└── static/
    ├── style.css          # Styling
    └── script.js          # Frontend logic
## Setup

```bash
git clone https://github.com/chasanth/College-FAQ-Chatbot.git
cd College-FAQ-Chatbot
python -m venv venv
venv\Scripts\activate      # Windows
source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
```

Create a `.env` file:

GROQ_API_KEY=your_key_here
GROQ_MODEL=llama-3.3-70b-versatile


Run the app:
```bash
python app.py
```

Open **http://127.0.0.1:5000**

## Customize
Edit `faq.json` to add your own college's questions and answers.

## Future Enhancements
- Connect to a real database (SQLite/PostgreSQL) instead of a static JSON file
- Admin panel to add/edit FAQs without touching code
- Multi-language support for regional languages
- Integration with WhatsApp/Telegram for wider student access
- Analytics dashboard to track most-asked questions
- User authentication for personalized responses (e.g. attendance, results)


