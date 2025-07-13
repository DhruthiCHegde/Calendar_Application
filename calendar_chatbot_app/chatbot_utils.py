from datetime import datetime, timedelta
from models import Event

def ask_chatbot(message):
    message = message.lower()
    now = datetime.now()

    if "today" in message:
        start = datetime(now.year, now.month, now.day)
        end = start + timedelta(days=1)
        events = Event.query.filter(Event.start >= start, Event.start < end).all()
        if events:
            return "Today’s meetings:\n" + "\n".join(f"- {e.title} at {e.start.strftime('%I:%M %p')}" for e in events)
        else:
            return "You have no meetings today."

    elif "tomorrow" in message:
        start = datetime(now.year, now.month, now.day) + timedelta(days=1)
        end = start + timedelta(days=1)
        events = Event.query.filter(Event.start >= start, Event.start < end).all()
        if events:
            return "Tomorrow’s meetings:\n" + "\n".join(f"- {e.title} at {e.start.strftime('%I:%M %p')}" for e in events)
        else:
            return "No meetings scheduled for tomorrow."

    elif "next week" in message:
        start = now + timedelta(days=1)
        end = now + timedelta(days=7)
        events = Event.query.filter(Event.start >= start, Event.start <= end).all()
        if events:
            return "Next week's events:\n" + "\n".join(f"- {e.title} on {e.start.strftime('%A')} at {e.start.strftime('%I:%M %p')}" for e in events)
        else:
            return "You have no events next week."

    elif "hi" in message or "hello" in message:
        return "Hi! You can ask me things like:\n- What meetings do I have today?\n- Any meetings tomorrow?\n- List events for next week."

    else:
        return "Sorry, I didn’t understand that. Try: 'today', 'tomorrow', or 'next week'."
