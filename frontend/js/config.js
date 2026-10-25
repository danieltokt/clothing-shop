// Локально — на локальный Django, на сайте — на Render.
// После деплоя бэкенда замени YOUR-APP на реальный адрес.
const API_URL = ["localhost", "127.0.0.1"].includes(location.hostname)
  ? "http://127.0.0.1:8001/api"
  : "https://clothing-shop-uqvt.onrender.com";