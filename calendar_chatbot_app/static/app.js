// static/app.js
document.addEventListener('DOMContentLoaded', function () {
  const calendarEl = document.getElementById('calendar');
  const eventModal = new bootstrap.Modal(document.getElementById('eventModal'));
  const form = document.getElementById('eventForm');
  const deleteBtn = document.getElementById('deleteEventBtn');
  const notifySelect = document.getElementById('notifyBefore');
  let selectedEvent = null;
  let eventNotifications = [];

  const toastEl = document.getElementById('liveToast');
  const toastBody = document.getElementById('toast-body');
  const toast = new bootstrap.Toast(toastEl);

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    editable: true,
    selectable: true,
    events: '/api/events',

    dateClick(info) {
      selectedEvent = null;
      form.reset();
      notifySelect.value = "5";
      document.getElementById('eventStart').value = info.dateStr + "T09:00";
      document.getElementById('eventEnd').value = info.dateStr + "T10:00";
      deleteBtn.style.display = "none";
      eventModal.show();
    },

    eventClick(info) {
      selectedEvent = info.event;
      document.getElementById('eventId').value = info.event.id;
      document.getElementById('eventTitle').value = info.event.title;
      document.getElementById('eventStart').value = info.event.startStr.slice(0, 16);
      document.getElementById('eventEnd').value = info.event.endStr.slice(0, 16);
      document.getElementById('eventDesc').value = info.event.extendedProps.description || "";
      notifySelect.value = info.event.extendedProps.notifyBefore || "5";
      deleteBtn.style.display = "inline-block";
      eventModal.show();
    },

    eventDrop: updateEvent,
    eventResize: updateEvent
  });

  calendar.render();

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const data = {
      title: document.getElementById('eventTitle').value,
      start: document.getElementById('eventStart').value,
      end: document.getElementById('eventEnd').value,
      description: document.getElementById('eventDesc').value,
      notifyBefore: notifySelect.value
    };

    const id = document.getElementById('eventId').value;

    if (id) {
      fetch('/api/events/' + id, { method: 'DELETE' }).then(() => {
        fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(() => {
          calendar.refetchEvents();
          eventModal.hide();
        });
      });
    } else {
      fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(() => {
        calendar.refetchEvents();
        eventModal.hide();
      });
    }
  });

  deleteBtn.addEventListener('click', function () {
    if (selectedEvent) {
      fetch('/api/events/' + selectedEvent.id, {
        method: 'DELETE'
      }).then(() => {
        calendar.refetchEvents();
        eventModal.hide();
      });
    }
  });

  function updateEvent(info) {
    const data = {
      title: info.event.title,
      start: info.event.start.toISOString(),
      end: info.event.end.toISOString(),
      description: info.event.extendedProps.description || "",
      notifyBefore: info.event.extendedProps.notifyBefore || "5"
    };

    fetch('/api/events/' + info.event.id, {
      method: 'DELETE'
    }).then(() => {
      fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(() => calendar.refetchEvents());
    });
  }

  // Chatbot
  const chatInput = document.getElementById('chat-input');
  const chatLog = document.getElementById('chat-log');

  chatInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter' && chatInput.value.trim()) {
      const msg = chatInput.value;
      chatLog.innerHTML += `<div><strong>You:</strong> ${msg}</div>`;
      chatInput.value = '';

      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      })
        .then(res => res.json())
        .then(data => {
          chatLog.innerHTML += `<div><strong>Bot:</strong> ${data.reply}</div>`;
          chatLog.scrollTop = chatLog.scrollHeight;
        });
    }
  });

  // 🔔 Notification Scheduler
  function checkNotifications() {
    const now = new Date();
    const buffer = 60000; // 1 min window

    calendar.getEvents().forEach(event => {
      const notifyBefore = parseInt(event.extendedProps.notifyBefore || 5);
      const eventStart = new Date(event.start);
      const diff = eventStart - now;
      const target = notifyBefore * 60 * 1000;

      if (diff > 0 && diff <= target + buffer && diff >= target - buffer) {
        showToast(event.title, eventStart.toLocaleTimeString());
      }
    });
  }

  function showToast(title, time) {
    toastBody.innerHTML = `⏰ <strong>${title}</strong> starts at ${time}`;
    toast.show();
  }

  // Start checking every 30 seconds
  setInterval(checkNotifications, 30000);
});
