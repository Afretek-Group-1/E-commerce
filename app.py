import sqlite3
import json
import os
import hashlib
from datetime import datetime
from werkzeug.utils import secure_filename
from flask import Flask, render_template, request, jsonify, session

app = Flask(__name__, template_folder="templates", static_folder="static")
app.secret_key = os.urandom(24)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "marketplace.db")
UPLOAD_FOLDER = os.path.join(BASE_DIR, "static", "uploads")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif"}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

MARKETPLACE_POLICIES = {
    "returns_and_exchanges": {
        "title": "30-Day Free Returns & Size Exchanges",
        "window_days": 30,
        "free_size_exchanges": True,
        "summary": "If your shoe or apparel size does not fit, exchange it for free within 30 days. No restocking fees.",
        "conditions": [
            "Items must be unworn, undamaged, with original tags and packaging intact.",
            "Footwear must be tested indoors on clean surfaces.",
            "Free size exchanges: courier collects the wrong size and delivers your requested replacement."
        ],
        "refund_timeline": "Refunds are processed within 3-5 business days after inspection to your original payment method or mobile money."
    },
    "shipping_and_delivery": {
        "title": "Shipping & Delivery Timelines",
        "free_shipping_threshold": 50.00,
        "standard_fee": 5.00,
        "currency": "USD",
        "timelines": {
            "metro_local": "1 to 3 business days",
            "regional_cross_border": "3 to 6 business days"
        },
        "dispatch_guarantee": "All verified sellers are contracted to dispatch orders within 24 to 48 business hours with live package tracking."
    },
    "payment_and_cod": {
        "title": "Payment & Cash on Delivery Protection",
        "methods": ["Cash on Delivery (COD)", "Mobile Money (M-Pesa, MTN MoMo)", "Debit/Credit Card (Visa, Mastercard)"],
        "cod_inspection_rule": "With Cash on Delivery, customers are allowed to inspect the sealed parcel with the courier before handing over physical payment."
    },
    "buyer_protection": {
        "title": "100% Buyer Protection & Authenticity Guarantee",
        "guarantee": "All independent merchants on Mercado undergo business identity verification. If you receive a damaged, defective, or incorrect item, you are entitled to an immediate 100% refund or free replacement."
    }
}

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def hash_pw(password):
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        
        # 1. Registered Sellers
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS sellers (
            id TEXT PRIMARY KEY,
            store_name TEXT NOT NULL,
            owner_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            location TEXT NOT NULL,
            dispatch_time TEXT DEFAULT 'Ships within 24-48 hours',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        # Migration: ensure dispatch_time column exists
        cursor.execute("PRAGMA table_info(sellers)")
        seller_cols = [c[1] for c in cursor.fetchall()]
        if "dispatch_time" not in seller_cols:
            cursor.execute("ALTER TABLE sellers ADD COLUMN dispatch_time TEXT DEFAULT 'Ships within 24-48 hours'")

        # 2. Listed Products
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            seller_id TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            category TEXT NOT NULL,
            image_url TEXT,
            stock INTEGER NOT NULL DEFAULT 0,
            sizes_json TEXT DEFAULT '[]',
            colors_json TEXT DEFAULT '[]',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (seller_id) REFERENCES sellers (id) ON DELETE CASCADE
        )
        """)

        # 3. Orders / Transactions
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            customer_name TEXT NOT NULL,
            customer_email TEXT NOT NULL,
            customer_phone TEXT,
            delivery_address TEXT NOT NULL,
            total_amount REAL NOT NULL,
            payment_method TEXT DEFAULT 'Cash on Delivery',
            status TEXT DEFAULT 'Confirmed',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        # 4. Order Line Items
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            seller_id TEXT NOT NULL,
            title TEXT NOT NULL,
            price REAL NOT NULL,
            size TEXT,
            color TEXT,
            qty INTEGER NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
            FOREIGN KEY (seller_id) REFERENCES sellers (id)
        )
        """)

        # 5. Verified Product Reviews
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id TEXT NOT NULL,
            author_name TEXT NOT NULL,
            rating INTEGER NOT NULL,
            comment TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
        )
        """)

        conn.commit()

init_db()

# ==========================================
# PAGE ROUTES
# ==========================================

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/seller")
def seller_page():
    return render_template("seller.html")

@app.route("/store/<seller_id>")
def store_page(seller_id):
    return render_template("store.html", seller_id=seller_id)

@app.route("/api/policies", methods=["GET"])
def get_policies():
    return jsonify(MARKETPLACE_POLICIES)

# ==========================================
# FILE UPLOAD API
# ==========================================

@app.route("/api/upload", methods=["POST"])
def upload_file():
    if "image" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if file and allowed_file(file.filename):
        ext = file.filename.rsplit(".", 1)[1].lower()
        unique_name = f"item_{int(datetime.now().timestamp() * 1000)}_{os.urandom(4).hex()}.{ext}"
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], unique_name)
        file.save(filepath)

        file_url = f"/static/uploads/{unique_name}"
        return jsonify({"success": True, "url": file_url})

    return jsonify({"error": "File type not supported. Use JPG, PNG, or WebP."}), 400

# ==========================================
# SELLER AUTHENTICATION API
# ==========================================

@app.route("/api/seller/register", methods=["POST"])
def seller_register():
    data = request.json or {}
    store_name = data.get("store_name", "").strip()
    owner_name = data.get("owner_name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    location = data.get("location", "").strip()
    dispatch_time = data.get("dispatch_time", "Ships within 24-48 hours").strip()

    if not store_name or not owner_name or not email or not password:
        return jsonify({"error": "All required fields must be filled"}), 400

    seller_id = f"seller-{int(datetime.now().timestamp() * 1000) % 1000000}"
    pw_hash = hash_pw(password)

    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO sellers (id, store_name, owner_name, email, password_hash, location, dispatch_time)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (seller_id, store_name, owner_name, email, pw_hash, location, dispatch_time))
            conn.commit()

        session["seller_id"] = seller_id
        session["store_name"] = store_name
        return jsonify({"success": True, "seller_id": seller_id, "store_name": store_name}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "A store with this email already exists"}), 409
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500

@app.route("/api/seller/login", methods=["POST"])
def seller_login():
    data = request.json or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    pw_hash = hash_pw(password)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sellers WHERE email = ? AND password_hash = ?", (email, pw_hash))
        seller = cursor.fetchone()

        if not seller:
            return jsonify({"error": "Invalid email or password"}), 401

        session["seller_id"] = seller["id"]
        session["store_name"] = seller["store_name"]

        return jsonify({
            "success": True,
            "seller_id": seller["id"],
            "store_name": seller["store_name"],
            "owner_name": seller["owner_name"],
            "email": seller["email"],
            "location": seller["location"],
            "dispatch_time": seller["dispatch_time"] if "dispatch_time" in seller.keys() else "Ships within 24-48 hours"
        })

@app.route("/api/seller/me", methods=["GET"])
def seller_me():
    seller_id = session.get("seller_id")
    if not seller_id:
        return jsonify({"authenticated": False})

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, store_name, owner_name, email, location, dispatch_time FROM sellers WHERE id = ?", (seller_id,))
        seller = cursor.fetchone()
        if not seller:
            session.clear()
            return jsonify({"authenticated": False})

        return jsonify({"authenticated": True, "seller": dict(seller)})

@app.route("/api/seller/logout", methods=["POST"])
def seller_logout():
    session.clear()
    return jsonify({"success": True})

# ==========================================
# SELLER PORTAL MANAGEMENT API
# ==========================================

@app.route("/api/seller/products", methods=["GET"])
def seller_get_products():
    seller_id = session.get("seller_id")
    if not seller_id:
        return jsonify({"error": "Unauthorized"}), 401

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM products WHERE seller_id = ? ORDER BY created_at DESC", (seller_id,))
        rows = cursor.fetchall()
        products = []
        for r in rows:
            p = dict(r)
            p["sizes"] = json.loads(p.get("sizes_json") or "[]")
            p["colors"] = json.loads(p.get("colors_json") or "[]")
            products.append(p)

    return jsonify(products)

@app.route("/api/seller/products", methods=["POST"])
def seller_add_product():
    seller_id = session.get("seller_id")
    if not seller_id:
        return jsonify({"error": "Unauthorized. Please login first."}), 401

    data = request.json or {}
    title = data.get("title", "").strip()
    price = float(data.get("price", 0))
    category = data.get("category", "General").strip()
    image_url = data.get("image_url", "").strip()
    description = data.get("description", "").strip()
    stock = int(data.get("stock", 0))

    sizes = data.get("sizes", [])
    colors = data.get("colors", [])

    if not title or price <= 0:
        return jsonify({"error": "Valid product title and price are required"}), 400

    product_id = f"prod-{int(datetime.now().timestamp() * 1000) % 1000000}"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO products (id, seller_id, title, description, price, category, image_url, stock, sizes_json, colors_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (product_id, seller_id, title, description, price, category, image_url, stock, json.dumps(sizes), json.dumps(colors)))
        conn.commit()

    return jsonify({"success": True, "product_id": product_id}), 201

@app.route("/api/seller/products/<product_id>", methods=["DELETE"])
def seller_delete_product(product_id):
    seller_id = session.get("seller_id")
    if not seller_id:
        return jsonify({"error": "Unauthorized"}), 401

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM products WHERE id = ? AND seller_id = ?", (product_id, seller_id))
        conn.commit()

    return jsonify({"success": True})

@app.route("/api/seller/orders", methods=["GET"])
def seller_get_orders():
    seller_id = session.get("seller_id")
    if not seller_id:
        return jsonify({"error": "Unauthorized"}), 401

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT oi.*, o.customer_name, o.customer_email, o.customer_phone, o.delivery_address, o.payment_method, o.status, o.created_at as order_date
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE oi.seller_id = ?
        ORDER BY o.created_at DESC
        """, (seller_id,))
        rows = [dict(r) for r in cursor.fetchall()]

    return jsonify(rows)

@app.route("/api/seller/stats", methods=["GET"])
def seller_get_stats():
    seller_id = session.get("seller_id")
    if not seller_id:
        return jsonify({"error": "Unauthorized"}), 401

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as prod_count, COALESCE(SUM(stock), 0) as total_stock FROM products WHERE seller_id = ?", (seller_id,))
        prod_stats = cursor.fetchone()

        cursor.execute("""
        SELECT COUNT(DISTINCT order_id) as order_count, COALESCE(SUM(price * qty), 0) as total_revenue
        FROM order_items
        WHERE seller_id = ?
        """, (seller_id,))
        sales_stats = cursor.fetchone()

    return jsonify({
        "products_count": prod_stats["prod_count"],
        "total_stock": prod_stats["total_stock"],
        "orders_count": sales_stats["order_count"],
        "total_revenue": round(sales_stats["total_revenue"], 2)
    })

# ==========================================
# PUBLIC MARKETPLACE API
# ==========================================

@app.route("/api/products", methods=["GET"])
def public_get_products():
    seller_id = request.args.get("seller_id")
    category = request.args.get("category")
    q = request.args.get("q", "").strip().lower()

    sql = """
    SELECT p.*, s.store_name, s.location as store_location, s.dispatch_time
    FROM products p
    JOIN sellers s ON p.seller_id = s.id
    WHERE 1=1
    """
    params = []

    if seller_id:
        sql += " AND p.seller_id = ?"
        params.append(seller_id)
    if category and category != "All":
        sql += " AND p.category = ?"
        params.append(category)
    if q:
        sql += " AND (LOWER(p.title) LIKE ? OR LOWER(p.description) LIKE ? OR LOWER(p.category) LIKE ? OR LOWER(s.store_name) LIKE ?)"
        params.extend([f"%{q}%", f"%{q}%", f"%{q}%", f"%{q}%"])

    sql += " ORDER BY p.created_at DESC"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        products = []
        for r in rows:
            p = dict(r)
            p["sizes"] = json.loads(p.get("sizes_json") or "[]")
            p["colors"] = json.loads(p.get("colors_json") or "[]")

            cursor.execute("SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE product_id = ?", (p["id"],))
            rev = cursor.fetchone()
            p["rating"] = round(rev["avg_rating"], 1) if rev["avg_rating"] else None
            p["reviews_count"] = rev["count"] or 0

            products.append(p)

    return jsonify(products)

@app.route("/api/products/<product_id>", methods=["GET"])
def public_get_product_detail(product_id):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT p.*, s.store_name, s.owner_name, s.location as store_location, s.dispatch_time, s.email as store_email
        FROM products p
        JOIN sellers s ON p.seller_id = s.id
        WHERE p.id = ?
        """, (product_id,))
        row = cursor.fetchone()
        if not row:
            return jsonify({"error": "Product not found"}), 404

        product = dict(row)
        product["sizes"] = json.loads(product.get("sizes_json") or "[]")
        product["colors"] = json.loads(product.get("colors_json") or "[]")

        cursor.execute("SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC", (product_id,))
        reviews = [dict(r) for r in cursor.fetchall()]
        product["reviews"] = reviews
        product["rating"] = round(sum(r["rating"] for r in reviews) / len(reviews), 1) if reviews else None
        product["reviews_count"] = len(reviews)
        product["policies"] = MARKETPLACE_POLICIES

    return jsonify(product)

@app.route("/api/sellers", methods=["GET"])
def public_get_sellers():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT s.id, s.store_name, s.owner_name, s.location, s.dispatch_time, s.created_at, COUNT(p.id) as product_count
        FROM sellers s
        LEFT JOIN products p ON s.id = p.seller_id
        GROUP BY s.id
        ORDER BY s.created_at DESC
        """)
        sellers = [dict(r) for r in cursor.fetchall()]
    return jsonify(sellers)

@app.route("/api/sellers/<seller_id>", methods=["GET"])
def public_get_seller_profile(seller_id):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, store_name, owner_name, location, dispatch_time, email, created_at FROM sellers WHERE id = ?", (seller_id,))
        row = cursor.fetchone()
        if not row:
            return jsonify({"error": "Seller not found"}), 404
        seller = dict(row)

        cursor.execute("SELECT * FROM products WHERE seller_id = ? ORDER BY created_at DESC", (seller_id,))
        products = []
        for r in cursor.fetchall():
            p = dict(r)
            p["sizes"] = json.loads(p.get("sizes_json") or "[]")
            p["colors"] = json.loads(p.get("colors_json") or "[]")
            products.append(p)
        seller["products"] = products
        seller["policies"] = MARKETPLACE_POLICIES

    return jsonify(seller)

@app.route("/api/orders", methods=["POST"])
def public_create_order():
    data = request.json or {}
    items = data.get("items", [])
    if not items:
        return jsonify({"error": "Cart is empty"}), 400

    customer_name = data.get("customer_name", "").strip()
    customer_email = data.get("customer_email", "").strip()
    customer_phone = data.get("customer_phone", "").strip()
    delivery_address = data.get("delivery_address", "").strip()
    payment_method = data.get("payment_method", "Cash on Delivery")

    if not customer_name or not customer_email or not delivery_address:
        return jsonify({"error": "Name, email, and delivery address are required"}), 400

    total_amount = sum(float(i.get("price", 0)) * int(i.get("qty", 1)) for i in items)
    order_id = f"ORD-{int(datetime.now().timestamp()) % 1000000}"

    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
        INSERT INTO orders (id, customer_name, customer_email, customer_phone, delivery_address, total_amount, payment_method)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (order_id, customer_name, customer_email, customer_phone, delivery_address, total_amount, payment_method))

        for item in items:
            cursor.execute("""
            INSERT INTO order_items (order_id, product_id, seller_id, title, price, size, color, qty)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                order_id,
                item.get("id"),
                item.get("seller_id"),
                item.get("title"),
                float(item.get("price", 0)),
                item.get("size", ""),
                item.get("color", ""),
                int(item.get("qty", 1))
            ))

            cursor.execute("UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?", (int(item.get("qty", 1)), item.get("id")))

        conn.commit()

    return jsonify({
        "success": True,
        "order_id": order_id,
        "total_amount": total_amount,
        "customer_name": customer_name
    }), 201

@app.route("/api/reviews", methods=["POST"])
def public_add_review():
    data = request.json or {}
    product_id = data.get("product_id")
    author_name = data.get("author_name", "").strip()
    rating = int(data.get("rating", 5))
    comment = data.get("comment", "").strip()

    if not product_id or not author_name or not comment:
        return jsonify({"error": "Author name and comment are required"}), 400

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO reviews (product_id, author_name, rating, comment)
        VALUES (?, ?, ?, ?)
        """, (product_id, author_name, rating, comment))
        conn.commit()

    return jsonify({"success": True}), 201

# ==========================================
# ASSISTANT API (DYNAMIC CONCIERGE)
# ==========================================

@app.route("/api/assistant/chat", methods=["POST"])
def assistant_chat():
    import re
    data = request.json or {}
    message = data.get("message", "").strip()
    if not message:
        return jsonify({
            "reply": "How can I help you today? You can search for products, check sizing, or ask about delivery and return policies.",
            "products": [],
            "suggested_actions": ["Browse All Products", "Return Policy", "Delivery Times"]
        })

    lower_msg = message.lower()
    
    # 1. Price constraint extraction (e.g., "under 70", "below $80")
    max_price = None
    price_match = re.search(r'(?:under|below|less than|max)\s*\$?\s*(\d+(?:\.\d+)?)', lower_msg)
    if price_match:
        try:
            max_price = float(price_match.group(1))
        except ValueError:
            pass

    # 2. Dynamic policy lookup
    policy_snippet = None
    if any(w in lower_msg for w in ["return", "exchange", "refund", "size exchange", "replace"]):
        p = MARKETPLACE_POLICIES.get("returns_and_exchanges", {})
        policy_snippet = {
            "title": p.get("title"),
            "badge": "30-Day Free Returns",
            "summary": p.get("summary"),
            "conditions": p.get("conditions", [])
        }
    elif any(w in lower_msg for w in ["cash on delivery", "cod", "inspect", "inspection", "pay", "payment", "mobile money"]):
        p = MARKETPLACE_POLICIES.get("payment_and_cod", {})
        policy_snippet = {
            "title": p.get("title"),
            "badge": "Inspect Before Paying",
            "summary": p.get("cod_inspection_rule"),
            "methods": p.get("methods", [])
        }
    elif any(w in lower_msg for w in ["ship", "shipping", "deliver", "delivery", "dispatch", "how long"]):
        p = MARKETPLACE_POLICIES.get("shipping_and_delivery", {})
        policy_snippet = {
            "title": p.get("title"),
            "badge": "Free Delivery > $50",
            "summary": f"Metro areas: {p.get('timelines', {}).get('metro_local')}. Regional: {p.get('timelines', {}).get('regional_cross_border')}.",
            "guarantee": p.get("dispatch_guarantee")
        }
    elif any(w in lower_msg for w in ["size", "sizes", "fit", "fitting", "chart", "uk", "us"]):
        policy_snippet = {
            "title": "Footwear Sizing & Conversion Guide",
            "badge": "True to Size",
            "summary": "Our shoes use standard UK sizing (UK 6 = EU 40, UK 7 = EU 41, UK 8 = EU 42, UK 9 = EU 43, UK 10 = EU 44, UK 11 = EU 45). If between sizes, order true to size. Free exchanges within 30 days!"
        }

    # 3. Dynamic Database Search across all live products
    stop_words = {"the", "for", "and", "with", "show", "what", "find", "can", "you", "are", "have", "want", "like", "need", "get", "got", "look", "looking", "this", "that"}
    tokens = [t for t in re.findall(r'\b\w+\b', lower_msg) if len(t) > 2 and t not in stop_words]

    matched_products = []
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT p.id, p.seller_id, p.title, p.description, p.price, p.category, 
                   p.image_url, p.stock, p.sizes_json, p.colors_json, s.store_name, s.dispatch_time
            FROM products p
            JOIN sellers s ON p.seller_id = s.id
            WHERE p.stock > 0
        """)
        rows = cursor.fetchall()

    for r in rows:
        title = r["title"] or ""
        desc = r["description"] or ""
        cat = r["category"] or ""
        store = r["store_name"] or ""
        price = float(r["price"])
        sizes = json.loads(r["sizes_json"] or "[]")
        colors = json.loads(r["colors_json"] or "[]")

        if max_price is not None and price > max_price:
            continue

        score = 0
        category_synonyms = {
            "Footwear": ["shoe", "shoes", "sneaker", "sneakers", "kicks", "boots", "sandals", "trainers", "footwear"],
            "Apparel": ["cloth", "clothes", "clothing", "shirt", "shirts", "t-shirt", "tee", "pants", "trousers", "jacket", "hoodie", "dress", "apparel"],
            "Electronics": ["phone", "electronics", "gadget", "watch", "charger", "laptop", "audio", "headphone"],
            "Accessories": ["bag", "bags", "backpack", "belt", "wallet", "cap", "hat", "accessory", "accessories"]
        }
        for syn_cat, syn_words in category_synonyms.items():
            if cat.lower() == syn_cat.lower():
                for syn in syn_words:
                    if syn in lower_msg:
                        score += 5
                        break

        for token in tokens:
            if token in title.lower():
                score += 5
            elif token in cat.lower():
                score += 4
            elif token in desc.lower():
                score += 2
            elif token in store.lower():
                score += 3
            for c in colors:
                if token in c.lower():
                    score += 4
            for s in sizes:
                if token in s.lower():
                    score += 4

        matched_products.append({
            "product": {
                "id": r["id"],
                "title": title,
                "price": price,
                "category": cat,
                "description": desc,
                "image_url": r["image_url"] or "/static/uploads/placeholder.jpg",
                "stock": r["stock"],
                "sizes": sizes,
                "colors": colors,
                "store_name": store,
                "dispatch_time": r["dispatch_time"]
            },
            "score": score
        })

    # Sort descending by score
    matched_products.sort(key=lambda x: x["score"], reverse=True)
    products = [p["product"] for p in matched_products if p["score"] > 0]

    # If no specific keyword matches were found but user just said "show products" or similar
    if not products and any(w in lower_msg for w in ["all", "everything", "products", "items", "browse", "catalog"]):
        products = [p["product"] for p in matched_products][:6]

    # Construct dynamic reply
    if products:
        reply = f"I found {len(products)} live product{'s' if len(products) != 1 else ''} matching your search from our verified merchants. Click 'Select Size & Add' on any item to customize your size, pick a color, and add it to your bag."
    elif policy_snippet:
        reply = f"Here is the official platform information regarding your question. You can also explore our active inventory or check delivery options below."
    else:
        reply = "I couldn't find any listings matching those exact search terms in our live database. Try searching by shoe model, category (Footwear, Apparel), or ask about our store policies."

    suggested = ["30-Day Return Policy", "Delivery Timelines", "Payment & COD"]
    if products:
        suggested.insert(0, "How do shoe sizes work?")

    return jsonify({
        "reply": reply,
        "products": products,
        "policy_snippet": policy_snippet,
        "suggested_actions": suggested
    })

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
