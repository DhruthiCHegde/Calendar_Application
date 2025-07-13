from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from models import db, Event
from chatbot_utils import ask_chatbot
from notification_utils import send_notification

app = Flask(__name__, static_folder='static', template_folder='templates')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

with app.app_context():
    db.create_all()

# Home route - renders calendar and chatbot
@app.route('/')
def index():
    return render_template('index.html')

# API - Get all events
@app.route('/api/events', methods=['GET'])
def get_events():
    events = Event.query.all()
    return jsonify([e.to_dict() for e in events])

# API - Create new event
@app.route('/api/events', methods=['POST'])
def create_event():
    data = request.get_json()
    try:
        event = Event(
            title=data['title'],
            start=datetime.fromisoformat(data['start']),
            end=datetime.fromisoformat(data['end']),
            description=data.get('description', '')
        )
        db.session.add(event)
        db.session.commit()
        return jsonify({"status": "created"})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# API - Delete an event
@app.route('/api/events/<int:event_id>', methods=['DELETE'])
def delete_event(event_id):
    event = Event.query.get(event_id)
    if event:
        db.session.delete(event)
        db.session.commit()
        return jsonify({"status": "deleted"})
    return jsonify({"error": "Not found"}), 404

# API - Chatbot message handler
@app.route('/api/chat', methods=['POST'])
def chat():
    user_msg = request.json.get("message")
    reply = ask_chatbot(user_msg)
    return jsonify({"reply": reply})

# Notification checker - runs in background
def check_upcoming_events():
    now = datetime.utcnow()
    upcoming = Event.query.filter(
        Event.start <= now + timedelta(minutes=5),
        Event.start > now,
        Event.notified == False
    ).all()
    for event in upcoming:
        send_notification(event)
        event.notified = True
        db.session.commit()

# Background scheduler to run notification check every minute
scheduler = BackgroundScheduler()
scheduler.add_job(check_upcoming_events, 'interval', minutes=1)
scheduler.start()

# Run the app
if __name__ == '__main__':
    app.run(debug=True)
