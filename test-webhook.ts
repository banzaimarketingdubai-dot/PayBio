import fetch from 'node-fetch';

async function run() {
  const payload = {
    update_id: 12345,
    message: {
      message_id: 1,
      from: {
        id: 7999888,
        is_bot: false,
        first_name: "Test",
        username: "testuser",
        language_code: "ru"
      },
      chat: {
        id: 7999888,
        first_name: "Test",
        username: "testuser",
        type: "private"
      },
      date: 1690000000,
      text: "/start"
    }
  };

  try {
    const res = await fetch('http://localhost:3000/api/telegram/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', text);
  } catch (err) {
    console.error(err);
  }
}

run();
