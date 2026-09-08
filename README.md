# Mercado | Pan-African Multi-Vendor Marketplace & AI Shopping Assistant

[![Afretec Hackathon](https://img.shields.io/badge/Afretec%20Hackathon-Challenge%201%3A%20E--Commerce-black?style=for-the-badge)](https://afretec.org)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?style=for-the-badge&logo=python)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.0-lightgrey?style=for-the-badge&logo=flask)](https://palletsprojects.com/p/flask/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com)
[![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge&logo=sqlite)](https://sqlite.org)

An intelligent, multi-vendor e-commerce platform built for Pan-African commerce. It connects independent merchants directly with everyday shoppers through dynamic product listings, local device media uploads, Nike-inspired variant customization, and an **AI Shopping Concierge** grounded in live inventory and store policies.

---

## 🚀 Key Features

### 1. Curated Storefront & Dynamic Catalog
- **100% Dynamic Inventory:** Zero hardcoded mock products. All listings are dynamically retrieved from persistent SQLite storage (`marketplace.db`).
- **Nike-Style Variant Configurator:** Interactive modal allowing customers to inspect high-resolution product photos, switch color palettes via visual circular swatches, and choose precise sizes (e.g. UK 6–11, apparel sizes).
- **Cart & Line-Item Routing:** Persistent shopping bag with live counter, quantity adjustment, and multi-vendor order routing.

### 2. Seller Studio (Merchant Management)
- **Seller Authentication:** Multi-vendor registration and secure login.
- **Local Media Upload:** Drag-and-drop file uploader saving product imagery directly from local devices to `/static/uploads/`.
- **Listing Studio:** Real-time color palette selector, one-click size preset buttons, stock control, and category assignment.
- **Merchant Analytics:** Live tracking of revenue, order history, inventory counts, and public storefront links (`/store/<id>`).

### 3. Pan-African AI Shopping Concierge (Challenge 1)
- **Three Core Pillars:**
  - **Discovery:** Conversational search across live inventory with dynamic in-chat product cards (photo, price, store name, stock badge, and a direct *"Select Size & Add"* button).
  - **Consultation:** Accurate, anti-hallucination guidance on **30-Day Free Returns & Size Exchanges**, delivery timelines, and Cash on Delivery package inspection rights.
  - **Transaction:** Seamless bridge from chat card $\rightarrow$ Nike configurator modal $\rightarrow$ shopping bag $\rightarrow$ checkout.
- **Hands-Free Voice Search:** Native Web Speech API integration with microphone recording feedback for local language shopping.
- **Azure AI Foundry Ready:** Designed to connect directly with `gpt-4o-mini` on Azure AI Foundry via function/tool calling.

---

## 🛠️ Tech Stack

- **Backend:** Python / Flask
- **Database:** SQLite (`marketplace.db`)
- **Frontend:** Modern Semantic HTML5, Tailwind CSS, Vanilla JavaScript
- **Audio/Voice:** Web Speech API (`webkitSpeechRecognition`)
- **AI / LLM Layer:** Azure AI Foundry / Azure OpenAI Service (Tool Calling)

---

## 🏁 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/Afretek-Group-1/E-commerce.git
cd E-commerce
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Run the application
```bash
python app.py
```

Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your browser:
- **Customer Storefront:** `http://127.0.0.1:5000/`
- **Seller Studio:** `http://127.0.0.1:5000/seller`
- **Public Vendor Store:** `http://127.0.0.1:5000/store/<seller-id>`

---

## 🛡️ License
Built for the Afretec Hackathon 2026.
