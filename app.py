import json
import os
import threading
import time
import urllib.request
from datetime import datetime
from functools import wraps
from flask import (
    Flask,
    render_template,
    request,
    redirect,
    url_for,
    session,
    jsonify,
    send_file
)

# --- 1. APP & WSGI-SAFE PATH CONFIGURATION ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(
    __name__,
    static_folder=os.path.join(BASE_DIR, "static"),
    template_folder=os.path.join(BASE_DIR, "templates")
)

app.secret_key = os.environ.get("FLASK_SECRET_KEY", "super_secret_epic_key_suman_2026")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "SUMANM0405")
DATA_FILE = os.path.join(BASE_DIR, "data.json")

data_lock = threading.RLock()

login_attempts = {}
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_SECONDS = 900  # 15 minutes


# --- 2. DEFAULT DATA SCHEMA & ATOMIC STORAGE ENGINE ---
def get_default_data():
    return {
        "about_text": (
            "1. I have a strong interest in full-stack programming and cloud architecture.\n"
            "2. I enjoy building applications with Python, Flask, Django, HTML, CSS, JavaScript, C++, and R.\n"
            "3. Experienced in deploying projects across AWS (EC2 & S3), PythonAnywhere, Vercel, Netlify, and Replit."
        ),
        "insta_link": "https://instagram.com/__suman._.007",
        "focus_1_title": "Full-Stack Web Development",
        "focus_1_desc": "Scalable Python Flask, Django & interactive 3D web apps",
        "focus_1_link": "#projects",
        "focus_2_title": "Cloud & Software Hosting",
        "focus_2_desc": "AWS (EC2 & S3), modern glassmorphism & motion UI",
        "focus_2_link": "#skills",
        "projects": [
            {
                "name": "Novasocial",
                "desc": "A full-fledged social media application designed to connect users.",
                "link": "#"
            },
            {
                "name": "NovaWave",
                "desc": "A real-time chat application built to facilitate instant communication.",
                "link": "#"
            },
            {
                "name": "KSEAB Portal",
                "desc": "A reliable web portal designed to securely display exam results.",
                "link": "#"
            }
        ],
        "visitors": [],
        "inquiries": [],
        "total_views": 0
    }


def load_data():
    """Thread-safe loader that guarantees all expected keys exist."""
    default_data = get_default_data()
    with data_lock:
        if not os.path.exists(DATA_FILE):
            save_data(default_data)
            return default_data

        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if not isinstance(data, dict):
                    return default_data
                for key, val in default_data.items():
                    if key not in data:
                        data[key] = val
                return data
        except (json.JSONDecodeError, OSError) as e:
            print(f"[WARN] data.json read error ({e}). Returning defaults.")
            return default_data


def save_data(data):
    """Thread-safe atomic write using a temporary file swap to prevent corruption."""
    with data_lock:
        temp_file = f"{DATA_FILE}.tmp"
        try:
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
            os.replace(temp_file, DATA_FILE)
        except OSError as e:
            print(f"[ERROR] Failed to save data.json: {e}")
            if os.path.exists(temp_file):
                try:
                    os.remove(temp_file)
                except OSError:
                    pass


# --- 3. HELPER UTILITIES & CLIENT HINTS HEADERS ---
def get_client_ip():
    """Safely extracts visitor IP behind proxies (PythonAnywhere, Cloudflare, AWS, Nginx)."""
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP", "")
    if real_ip:
        return real_ip.strip()
    return request.remote_addr or "Unknown"


GEO_CACHE = {}

def server_lookup_geo_isp(ip_addr):
    """
    Looks up Public IP, City/Region/Country, and ISP server-side with caching.
    Even on localhost (127.0.0.1), automatically resolves your real public IP and ISP!
    """
    cache_key = ip_addr or "local"
    if cache_key in GEO_CACHE:
        return GEO_CACHE[cache_key]

    # If on localhost/LAN, query without IP parameter so ip-api detects our real public IP
    is_local = (not ip_addr) or ip_addr in ("127.0.0.1", "::1", "localhost", "Unknown") or ip_addr.startswith("192.168.") or ip_addr.startswith("10.")
    target_query = "" if is_local else ip_addr

    try:
        url = f"http://ip-api.com/json/{target_query}?fields=status,country,regionName,city,isp,org,query"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=2.5) as resp:
            info = json.loads(resp.read().decode("utf-8"))
            if info.get("status") == "success":
                resolved_ip = info.get("query") or ip_addr
                loc = ", ".join(filter(None, [info.get("city"), info.get("regionName"), info.get("country")])) or "Unknown Location"
                isp = info.get("isp") or info.get("org") or "Standard ISP"
                result = (resolved_ip, loc, isp)
                GEO_CACHE[cache_key] = result
                return result
    except Exception:
        pass

    fallback = (ip_addr or "Unknown", "Unknown Location", "Standard ISP")
    return fallback


def admin_required(f):
    """Decorator to protect admin POST/GET actions."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get("admin_logged_in"):
            if request.is_json:
                return jsonify({"status": "unauthorized", "message": "Admin login required"}), 401
            return redirect(url_for("admin"))
        return f(*args, **kwargs)
    return decorated_function


@app.after_request
def apply_security_and_client_hint_headers(response):
    """
    Instructs mobile browsers (Android Chrome/Edge/Opera) to unlock High-Entropy
    Hardware Model & OS Version headers on page load and fetch calls.
    """
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Accept-CH"] = (
        "Sec-CH-UA, Sec-CH-UA-Mobile, Sec-CH-UA-Model, "
        "Sec-CH-UA-Platform, Sec-CH-UA-Platform-Version, Sec-CH-UA-Full-Version-List"
    )
    response.headers["Permissions-Policy"] = (
        "ch-ua-model=(self), ch-ua-platform=(self), ch-ua-platform-version=(self)"
    )
    return response


# --- 4. PUBLIC PORTFOLIO & DEEP TELEMETRY TRACKER ROUTES ---
@app.route("/")
def home():
    data = load_data()
    return render_template("index2.html", data=data)


@app.route("/log_visitor", methods=["POST"])
def log_visitor():
    """Logs visitor hardware, ISP, geolocation, and network speed with zero browser 429 errors."""
    try:
        client_data = request.get_json(silent=True)
        if not client_data or not isinstance(client_data, dict):
            return jsonify({"status": "error", "message": "Invalid JSON payload"}), 400

        raw_ip = get_client_ip()
        ip_addr, location, isp = server_lookup_geo_isp(raw_ip)

        now_str = datetime.now().strftime("%Y-%m-%d %I:%M %p")
        now_ts = time.time()

        header_model = request.headers.get("Sec-CH-UA-Model", "").strip('" ')
        header_mobile = request.headers.get("Sec-CH-UA-Mobile", "")

        os_name = str(client_data.get("os", "Unknown OS")).strip()[:60]
        browser_name = str(client_data.get("browser", "Unknown Browser")).strip()[:60]
        device_name = str(client_data.get("device", "Unknown Device")).strip()[:80]
        device_type = str(client_data.get("type", "Desktop")).strip()[:30]

        if header_mobile == "?1" and device_type == "Desktop":
            device_type = "Mobile"
        if header_model and ("Smartphone" in device_name or "Unknown" in device_name or device_name == "Desktop / PC"):
            device_name = header_model[:80]

        gpu_name = str(client_data.get("gpu", "")).strip()[:80]
        hw_specs = str(client_data.get("hw_specs", "")).strip()[:50]
        screen_res = str(client_data.get("screen", "")).strip()[:40]
        timezone = str(client_data.get("timezone", "")).strip()[:50]
        language = str(client_data.get("language", "")).strip()[:20]
        net_type = str(client_data.get("net_type", "Online")).strip()[:40]
        net_speed = str(client_data.get("net_speed", "Auto")).strip()[:40]

        with data_lock:
            data = load_data()
            data["total_views"] = int(data.get("total_views", len(data.get("visitors", [])))) + 1
            visitors = data.get("visitors", [])

            # Only merge if IP, Form Factor (Mobile vs Desktop), AND Device Model match within 5 mins
            if (
                visitors
                and visitors[0].get("ip") == ip_addr
                and visitors[0].get("type") == device_type
                and visitors[0].get("device") == device_name
                and (now_ts - visitors[0].get("timestamp", 0)) < 300
            ):
                visitors[0].update({
                    "time": now_str,
                    "timestamp": now_ts,
                    "os": os_name,
                    "browser": browser_name,
                    "device": device_name,
                    "type": device_type,
                    "gpu": gpu_name,
                    "hw_specs": hw_specs,
                    "screen": screen_res,
                    "timezone": timezone,
                    "language": language,
                    "net_type": net_type,
                    "net_speed": net_speed,
                    "location": location,
                    "isp": isp,
                    "hits": int(visitors[0].get("hits", 1)) + 1
                })
            else:
                visitor_info = {
                    "time": now_str,
                    "timestamp": now_ts,
                    "ip": ip_addr,
                    "os": os_name,
                    "browser": browser_name,
                    "device": device_name,
                    "type": device_type,
                    "gpu": gpu_name,
                    "hw_specs": hw_specs,
                    "screen": screen_res,
                    "timezone": timezone,
                    "language": language,
                    "net_type": net_type,
                    "net_speed": net_speed,
                    "location": location,
                    "isp": isp,
                    "hits": 1
                }
                visitors.insert(0, visitor_info)

            data["visitors"] = visitors[:150]
            save_data(data)

        return jsonify({
            "status": "success",
            "total_views": data["total_views"],
            "ip": ip_addr,
            "location": location,
            "isp": isp
        })
    except Exception as e:
        print("JS Tracker Error:", e)
        return jsonify({"status": "error"}), 500

@app.route("/submit_inquiry", methods=["POST"])
def submit_inquiry():
    """Saves client inquiries from the popup form into data.json."""
    try:
        payload = request.get_json(silent=True) or request.form
        name = str(payload.get("name", "")).strip()[:80]
        location = str(payload.get("location", "")).strip()[:100]
        phone = str(payload.get("phone", "")).strip()[:30]
        details = str(payload.get("details", "")).strip()[:600]

        if not name or not details:
            return jsonify({"status": "error", "message": "Name and project details are required"}), 400

        with data_lock:
            data = load_data()
            inquiries = data.get("inquiries", [])
            inquiries.insert(0, {
                "time": datetime.now().strftime("%Y-%m-%d %I:%M %p"),
                "name": name,
                "location": location,
                "phone": phone,
                "details": details,
                "ip": get_client_ip()
            })
            data["inquiries"] = inquiries[:100]
            save_data(data)

        return jsonify({"status": "success"})
    except Exception as e:
        print("Inquiry Save Error:", e)
        return jsonify({"status": "error"}), 500


# --- 5. ADMIN DASHBOARD & CRUD ROUTES ---
@app.route("/suman/04051107/", methods=["GET", "POST"], strict_slashes=False)
@app.route("/suman/04051107", methods=["GET", "POST"])
def admin():
    client_ip = get_client_ip()
    now = time.time()

    attempt_info = login_attempts.get(client_ip, {"count": 0, "lock_until": 0})
    if attempt_info["lock_until"] > now:
        remaining_mins = int((attempt_info["lock_until"] - now) // 60) + 1
        return f"Too many failed login attempts. Try again in {remaining_mins} minute(s).", 429

    if request.method == "POST" and "password" in request.form:
        entered_pw = request.form.get("password", "")
        if entered_pw == ADMIN_PASSWORD:
            session["admin_logged_in"] = True
            login_attempts.pop(client_ip, None)
            return redirect(url_for("admin"))
        else:
            attempt_info["count"] = attempt_info.get("count", 0) + 1
            if attempt_info["count"] >= MAX_LOGIN_ATTEMPTS:
                attempt_info["lock_until"] = now + LOCKOUT_SECONDS
            login_attempts[client_ip] = attempt_info
            return "Incorrect Password! Try again.", 401

    if not session.get("admin_logged_in"):
        return render_template("admin.html", logged_in=False)

    data = load_data()

    if request.method == "POST" and "about_text" in request.form:
        with data_lock:
            data = load_data()
            data["about_text"] = request.form.get("about_text", data["about_text"]).strip()
            data["insta_link"] = request.form.get("insta_link", data["insta_link"]).strip()
            data["focus_1_title"] = request.form.get("focus_1_title", data.get("focus_1_title", "")).strip()
            data["focus_1_desc"] = request.form.get("focus_1_desc", data.get("focus_1_desc", "")).strip()
            data["focus_1_link"] = request.form.get("focus_1_link", data.get("focus_1_link", "#")).strip()
            data["focus_2_title"] = request.form.get("focus_2_title", data.get("focus_2_title", "")).strip()
            data["focus_2_desc"] = request.form.get("focus_2_desc", data.get("focus_2_desc", "")).strip()
            data["focus_2_link"] = request.form.get("focus_2_link", data.get("focus_2_link", "#")).strip()
            save_data(data)
        return redirect(url_for("admin"))

    return render_template("admin.html", logged_in=True, data=data)


@app.route("/add_project", methods=["POST"])
@admin_required
def add_project():
    name = request.form.get("name", "New Project").strip()
    desc = request.form.get("desc", "").strip()
    link = request.form.get("link", "#").strip() or "#"

    with data_lock:
        data = load_data()
        data["projects"].append({
            "name": name,
            "desc": desc,
            "link": link
        })
        save_data(data)
    return redirect(url_for("admin"))


@app.route("/edit_project/<int:idx>", methods=["POST"])
@admin_required
def edit_project(idx):
    with data_lock:
        data = load_data()
        if 0 <= idx < len(data["projects"]):
            data["projects"][idx] = {
                "name": request.form.get("name", data["projects"][idx]["name"]).strip(),
                "desc": request.form.get("desc", data["projects"][idx]["desc"]).strip(),
                "link": request.form.get("link", data["projects"][idx]["link"]).strip() or "#"
            }
            save_data(data)
    return redirect(url_for("admin"))


@app.route("/reorder_project/<int:idx>/<direction>", methods=["POST"])
@admin_required
def reorder_project(idx, direction):
    with data_lock:
        data = load_data()
        projects = data.get("projects", [])
        if direction == "up" and 0 < idx < len(projects):
            projects[idx - 1], projects[idx] = projects[idx], projects[idx - 1]
            save_data(data)
        elif direction == "down" and 0 <= idx < len(projects) - 1:
            projects[idx + 1], projects[idx] = projects[idx], projects[idx + 1]
            save_data(data)
    return redirect(url_for("admin"))


@app.route("/delete_project/<int:idx>", methods=["POST"])
@admin_required
def delete_project(idx):
    with data_lock:
        data = load_data()
        if 0 <= idx < len(data["projects"]):
            data["projects"].pop(idx)
            save_data(data)
    return redirect(url_for("admin"))


@app.route("/delete_logs", methods=["POST"])
@admin_required
def delete_logs():
    with data_lock:
        data = load_data()
        data["visitors"] = []
        save_data(data)
    return redirect(url_for("admin"))


@app.route("/delete_inquiries", methods=["POST"])
@admin_required
def delete_inquiries():
    with data_lock:
        data = load_data()
        data["inquiries"] = []
        save_data(data)
    return redirect(url_for("admin"))


@app.route("/admin/export_backup", methods=["GET"])
@admin_required
def export_backup():
    if not os.path.exists(DATA_FILE):
        save_data(get_default_data())
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return send_file(
        DATA_FILE,
        mimetype="application/json",
        as_attachment=True,
        download_name=f"suman_portfolio_backup_{timestamp}.json"
    )


@app.route("/api/stats", methods=["GET"])
@admin_required
def api_stats():
    data = load_data()
    visitors = data.get("visitors", [])
    mobile_count = sum(1 for v in visitors if "mobile" in str(v.get("type", "")).lower())
    desktop_count = len(visitors) - mobile_count
    return jsonify({
        "status": "online",
        "total_views": data.get("total_views", len(visitors)),
        "recent_visitors_count": len(visitors),
        "projects_count": len(data.get("projects", [])),
        "inquiries_count": len(data.get("inquiries", [])),
        "device_split": {
            "mobile": mobile_count,
            "desktop": desktop_count
        }
    })


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()}), 200


@app.route("/logout")
def logout():
    session.pop("admin_logged_in", None)
    return redirect(url_for("home"))


@app.errorhandler(404)
def page_not_found(e):
    data = load_data()
    return render_template("error.html", data=data), 404


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)