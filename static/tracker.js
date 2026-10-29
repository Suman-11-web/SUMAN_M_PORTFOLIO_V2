/**
 * SUMANOS REAL HARDWARE, OS & MOBILE IDENTIFIER ENGINE v4.0
 * Combines Client Hints (High-Entropy), WebGL GPU Fingerprinting,
 * Screen/Pixel-Ratio Probing, and Deep OEM / In-App Browser Regex.
 */

(function () {
    // 1. Extract Real GPU Renderer via WebGL (Unmasks Apple M-Series, iPhone GPUs, Adreno/Mali)
    function getGPUInfo() {
        try {
            const canvas = document.createElement("canvas");
            const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
            if (!gl) return "";
            const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
            return debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : "";
        } catch (e) {
            return "";
        }
    }

    // 2. Identify iPhone Models via Screen Resolution + Pixel Ratio
    function detectiPhoneModel() {
        const w = Math.min(window.screen.width, window.screen.height);
        const h = Math.max(window.screen.width, window.screen.height);
        const dpr = window.devicePixelRatio || 1;
        const sig = `${w}x${h}@${dpr}`;

        const iphoneMap = {
            "440x956@3": "Apple iPhone 16 Pro Max",
            "402x874@3": "Apple iPhone 16 Pro",
            "430x932@3": "Apple iPhone 15/16 Plus or 14/15 Pro Max",
            "393x852@3": "Apple iPhone 15/16 or 14/15 Pro",
            "428x926@3": "Apple iPhone 12/13 Pro Max or 14 Plus",
            "390x844@3": "Apple iPhone 12/13/14 / Pro",
            "414x896@3": "Apple iPhone XS Max / 11 Pro Max",
            "414x896@2": "Apple iPhone XR / 11",
            "375x812@3": "Apple iPhone X / XS / 11 Pro / 12-13 Mini",
            "414x736@3": "Apple iPhone 6+/7+/8+ Plus",
            "375x667@2": "Apple iPhone SE / 6 / 7 / 8"
        };
        return iphoneMap[sig] || `Apple iPhone (${w}x${h})`;
    }

    // 3. Map Android OEM Build Model Codes to Real Commercial Names
    function mapAndroidModel(rawModel) {
        if (!rawModel) return "";
        const m = rawModel.trim();
        const upper = m.toUpperCase();

        // Nothing & CMF Phones
        if (upper.includes("A063")) return "Nothing Phone (1)";
        if (upper.includes("A065")) return "Nothing Phone (2)";
        if (upper.includes("A142")) return "Nothing Phone (2a)";
        if (upper.includes("A142P")) return "Nothing Phone (2a) Plus";
        if (upper.includes("A015")) return "CMF Phone 1";

        // Samsung Galaxy S / Z / A / M / F Series
        if (upper.startsWith("SM-")) {
            if (upper.startsWith("SM-S93")) return `Samsung Galaxy S25 Series (${m})`;
            if (upper.startsWith("SM-S92")) return `Samsung Galaxy S24 Series (${m})`;
            if (upper.startsWith("SM-S91")) return `Samsung Galaxy S23 Series (${m})`;
            if (upper.startsWith("SM-S90")) return `Samsung Galaxy S22 Series (${m})`;
            if (upper.startsWith("SM-G99")) return `Samsung Galaxy S21 Series (${m})`;
            if (upper.startsWith("SM-F9")) return `Samsung Galaxy Z Fold (${m})`;
            if (upper.startsWith("SM-F7")) return `Samsung Galaxy Z Flip (${m})`;
            if (upper.startsWith("SM-A")) return `Samsung Galaxy A-Series (${m})`;
            if (upper.startsWith("SM-M")) return `Samsung Galaxy M-Series (${m})`;
            if (upper.startsWith("SM-E")) return `Samsung Galaxy F-Series (${m})`;
            return `Samsung Galaxy (${m})`;
        }

        // Google Pixel
        if (upper.includes("PIXEL")) return `Google ${m}`;

        // OnePlus (CPH / LE / NE / PJ)
        if (upper.startsWith("ONEPLUS") || upper.startsWith("LE2") || upper.startsWith("NE2") || upper.startsWith("PJZ")) {
            return `OnePlus (${m})`;
        }
        if (upper.startsWith("CPH")) return `OnePlus / OPPO (${m})`;

        // Vivo / iQOO
        if (upper.startsWith("I2") || upper.includes("IQOO")) return `iQOO (${m})`;
        if (upper.startsWith("V2")) return `Vivo (${m})`;

        // Realme
        if (upper.startsWith("RMX")) return `Realme (${m})`;

        // Xiaomi / Redmi / POCO
        if (upper.startsWith("M2") || upper.startsWith("21") || upper.startsWith("22") || upper.startsWith("23") || upper.startsWith("24")) {
            return `Xiaomi / Redmi / POCO (${m})`;
        }

        // Motorola
        if (upper.startsWith("MOTO") || upper.startsWith("XT")) return `Motorola (${m})`;

        return m;
    }

    // 4. Main Async Hardware & OS Detection Engine
    async function getRealDeviceData() {
        const rawUA = navigator.userAgent || "";
        const ua = rawUA.toLowerCase();
        const gpu = getGPUInfo();
        const screenRes = `${window.screen.width}x${window.screen.height}`;

        let os = "Unknown OS";
        let browser = "Unknown Browser";
        let device = "Desktop / PC";
        let type = "Desktop";

        // --- A. DETECT BROWSER (Including Instagram, WhatsApp & In-App Browsers) ---
        if (ua.includes("instagram")) {
            browser = "Instagram In-App";
        } else if (ua.includes("whatsapp") || ua.includes("wa_")) {
            browser = "WhatsApp In-App";
        } else if (ua.includes("fban") || ua.includes("fbav")) {
            browser = "Facebook In-App";
        } else if (ua.includes("linkedinapp")) {
            browser = "LinkedIn In-App";
        } else if (navigator.brave && (await navigator.brave.isBrave().catch(() => false))) {
            browser = "Brave";
        } else if (ua.includes("samsungbrowser/")) {
            const v = rawUA.match(/SamsungBrowser\/([\d.]+)/i);
            browser = v ? `Samsung Internet ${v[1].split(".")[0]}` : "Samsung Internet";
        } else if (ua.includes("edg/") || ua.includes("edga/") || ua.includes("edgios/")) {
            const v = rawUA.match(/Edg[a-zA-Z]*\/([\d.]+)/i);
            browser = v ? `Edge ${v[1].split(".")[0]}` : "Microsoft Edge";
        } else if (ua.includes("opr/") || ua.includes("opera") || ua.includes("opt/")) {
            browser = "Opera";
        } else if (ua.includes("crios/")) {
            const v = rawUA.match(/CriOS\/([\d.]+)/i);
            browser = v ? `Chrome iOS ${v[1].split(".")[0]}` : "Chrome (iOS)";
        } else if (ua.includes("fxios/") || ua.includes("firefox/")) {
            const v = rawUA.match(/(?:Firefox|FxiOS)\/([\d.]+)/i);
            browser = v ? `Firefox ${v[1].split(".")[0]}` : "Firefox";
        } else if (ua.includes("chrome/") && !ua.includes("edg/")) {
            const v = rawUA.match(/Chrome\/([\d.]+)/i);
            browser = v ? `Chrome ${v[1].split(".")[0]}` : "Chrome";
        } else if (ua.includes("safari/") && !ua.includes("chrome")) {
            const v = rawUA.match(/Version\/([\d.]+)/i);
            browser = v ? `Safari ${v[1]}` : "Safari";
        }

        // --- B. DETECT MOBILE / TABLET / DESKTOP TYPE ---
        const isTouch = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
        const isIPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;

        if (isIPadOS || /ipad|tablet|playbook|silk/i.test(rawUA) || (/android/i.test(rawUA) && !/mobile/i.test(rawUA))) {
            type = "Tablet";
        } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(rawUA)) {
            type = "Mobile";
        } else if (navigator.userAgentData && navigator.userAgentData.mobile) {
            type = "Mobile";
        } else {
            type = "Desktop";
        }

        // --- C. MODERN CHROMIUM HIGH-ENTROPY CLIENT HINTS ---
        if (navigator.userAgentData && typeof navigator.userAgentData.getHighEntropyValues === "function") {
            try {
                const hints = await navigator.userAgentData.getHighEntropyValues([
                    "platform",
                    "platformVersion",
                    "model",
                    "architecture",
                    "bitness"
                ]);

                if (hints.platform === "Android") {
                    const ver = hints.platformVersion ? hints.platformVersion.split(".")[0] : "";
                    os = ver && ver !== "0" ? `Android ${ver}` : "Android";
                } else if (hints.platform === "Windows") {
                    // Windows 11 = major platformVersion >= 13; Windows 10 = 1 to 12
                    const major = parseInt((hints.platformVersion || "0").split(".")[0], 10);
                    if (major >= 13) os = "Windows 11";
                    else if (major > 0) os = "Windows 10";
                    else os = "Windows";
                } else if (hints.platform === "macOS") {
                    const ver = hints.platformVersion ? hints.platformVersion.split(".")[0] : "";
                    os = ver ? `macOS ${ver}` : "macOS";
                } else if (hints.platform) {
                    os = hints.platform;
                }

                if (hints.model && hints.model.trim() !== "") {
                    device = mapAndroidModel(hints.model);
                }
            } catch (err) {
                // High entropy blocked by browser privacy policy; falls back to UA + GPU below
            }
        }

        // --- D. DEEP USER-AGENT & GPU FALLBACK (iOS, macOS, In-App Browsers, Firefox/Safari) ---

        // 1. Apple iPhone
        if (/iphone/i.test(rawUA)) {
            type = "Mobile";
            const iosMatch = rawUA.match(/OS (\d+[_\d]*)/i);
            os = iosMatch ? `iOS ${iosMatch[1].replace(/_/g, ".")}` : "iOS";
            device = detectiPhoneModel();
        }
        // 2. Apple iPad (including iPadOS masquerading as MacIntel)
        else if (/ipad/i.test(rawUA) || isIPadOS) {
            type = "Tablet";
            const iosMatch = rawUA.match(/OS (\d+[_\d]*)/i);
            os = iosMatch ? `iPadOS ${iosMatch[1].replace(/_/g, ".")}` : "iPadOS";
            device = `Apple iPad (${screenRes})`;
        }
        // 3. Android (Fallback when Client Hints are missing or inside Instagram/WhatsApp)
        else if (/android/i.test(rawUA)) {
            if (type === "Desktop") type = "Mobile";

            if (os === "Unknown OS" || os === "Android") {
                const andMatch = rawUA.match(/Android\s+([\d.]+)/i);
                os = andMatch ? `Android ${andMatch[1]}` : "Android";
            }

            if (device === "Desktop / PC" || device === "Generic Android") {
                // Extract model from "Android X; <MODEL> Build/..." or "; <MODEL>; wv)"
                const buildMatch = rawUA.match(/Android[^;]+;\s*([^;)]+?)(?:\s+Build\/|;\s*wv|\))/i);
                if (buildMatch && buildMatch[1]) {
                    const candidate = buildMatch[1].trim();
                    // Ignore generic tokens like "K" from Chrome UA reduction
                    if (candidate.toUpperCase() !== "K" && candidate.length > 1) {
                        device = mapAndroidModel(candidate);
                    }
                }
                if (device === "Desktop / PC" || device === "K") {
                    const cleanGpu = gpu.replace(/ANGLE \((.+)\)/i, "\$1").split(",")[0].trim();
                    device = cleanGpu ? `Android (${cleanGpu} • ${screenRes})` : `Android Smartphone (${screenRes})`;
                }
            }
        }
        // 4. Apple Mac (macOS + Apple Silicon M1/M2/M3/M4 GPU detection)
        else if (/macintosh|mac os x/i.test(rawUA)) {
            type = "Desktop";
            if (os === "Unknown OS" || os === "macOS") {
                const macMatch = rawUA.match(/Mac OS X (\d+[._]\d+(?:[._]\d+)?)/i);
                os = macMatch ? `macOS ${macMatch[1].replace(/_/g, ".")}` : "macOS";
            }
            if (gpu.includes("Apple M")) {
                const mChip = gpu.match(/Apple M\d+(?:\s+(?:Pro|Max|Ultra))?/i);
                device = mChip ? `Apple Mac (${mChip[0]})` : "Apple Silicon Mac";
            } else if (gpu.includes("Apple GPU")) {
                device = `Apple Silicon Mac (${screenRes})`;
            } else {
                device = `Apple Mac (${screenRes})`;
            }
        }
        // 5. Windows Desktop/Laptop
        else if (/windows nt/i.test(rawUA)) {
            type = "Desktop";
            if (os === "Unknown OS") {
                if (rawUA.includes("Windows NT 10.0")) os = "Windows 10/11";
                else if (rawUA.includes("Windows NT 6.3")) os = "Windows 8.1";
                else if (rawUA.includes("Windows NT 6.1")) os = "Windows 7";
                else os = "Windows";
            }
            if (device === "Desktop / PC") {
                let shortGpu = "";
                if (/NVIDIA|GeForce|RTX|GTX/i.test(gpu)) {
                    const m = gpu.match(/(?:NVIDIA\s+)?(GeForce\s+[A-Z0-9\s]+|RTX\s+[A-Z0-9\s]+|GTX\s+[A-Z0-9\s]+)/i);
                    shortGpu = m ? m[0].trim() : "NVIDIA GPU";
                } else if (/Radeon|AMD/i.test(gpu)) {
                    shortGpu = "AMD Radeon";
                } else if (/Intel/i.test(gpu)) {
                    shortGpu = "Intel Graphics";
                }
                device = shortGpu ? `Windows PC (${shortGpu})` : `Windows PC (${screenRes})`;
            }
        }
        // 6. Linux
        else if (/linux/i.test(rawUA)) {
            type = "Desktop";
            if (os === "Unknown OS") os = /ubuntu/i.test(rawUA) ? "Ubuntu Linux" : "Linux";
            device = `Linux Workstation (${screenRes})`;
        }

        return { os, browser, device, type };
    }

    // 5. Execute & Dispatch Telemetry to Flask (/log_visitor)
    function sendTelemetry() {
        const ua = (navigator.userAgent || "").toLowerCase();
        const isBot = /bot|crawl|spider|slurp|googlebot|bingbot|yandex|headlesschrome|lighthouse/i.test(ua);
        if (isBot) return;

        getRealDeviceData()
            .then((payload) => {
                return fetch("/log_visitor", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                    keepalive: true
                });
            })
            .catch((err) => {
                console.debug("Telemetry skipped:", err);
            });
    }

    // Run safely even if DOMContentLoaded has already fired
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", sendTelemetry);
    } else {
        sendTelemetry();
    }
})();