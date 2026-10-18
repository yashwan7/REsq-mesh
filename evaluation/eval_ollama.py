import json, re, sys, time, requests

MODELS = sys.argv[1:] or ["qwen3:0.6b", "qwen3:4b"]
SEVERITY = {"HEALTHY": "low", "DEGRADING": "medium", "CRITICAL": "high"}
# Replace these with your real Laya decision names
DECISION = {"HEALTHY": "CONTINUE_NORMAL_OPERATION",
            "DEGRADING": "MONITOR_AND_EVALUATE_FAILOVER",
            "CRITICAL": "TRIGGER_FAILOVER"}
MUST_SAY = {"HEALTHY": "normal", "DEGRADING": "failover", "CRITICAL": "failover"}

def S(i, c, rssi, snr, per, ret, busy, jit):
    return dict(id=i, cls=c, rssi=rssi, snr=snr, per=per, retries=ret, busy=busy, jitter=jit)

SCENARIOS = [
    S("S01_healthy", "HEALTHY", -55, 30, 0.01, 0, 0.15, 5),
    S("S02_degrading_mixed", "DEGRADING", -84, 8, 0.31, 4, 0.62, 42),
    S("S03_critical", "CRITICAL", -95, 2, 0.72, 9, 0.91, 120),
    S("S04_only_busy_channel", "DEGRADING", -60, 25, 0.02, 1, 0.85, 18),
    S("S05_only_weak_signal", "DEGRADING", -88, 22, 0.03, 1, 0.20, 10),
    S("S06_only_jitter", "DEGRADING", -58, 28, 0.02, 0, 0.30, 95),
    S("S07_borderline", "DEGRADING", -81, 11, 0.12, 3, 0.55, 31),
    S("S08_recovering", "HEALTHY", -70, 18, 0.06, 2, 0.40, 20),
]

def facts(s):  # rule-based labels; tune thresholds for your own links
    return {
        "RSSI": (f"{s['rssi']} dBm", "weak" if s["rssi"] < -80 else "ok"),
        "SNR": (f"{s['snr']} dB", "low" if s["snr"] < 10 else "ok"),
        "Packet error rate": (s["per"], "high" if s["per"] > 0.1 else "ok"),
        "Retries": (s["retries"], "elevated" if s["retries"] >= 3 else "ok"),
        "Channel busy ratio": (s["busy"], "high" if s["busy"] > 0.5 else "ok"),
        "Jitter": (f"{s['jitter']} ms", "elevated" if s["jitter"] > 30 else "ok"),
    }

ORDER = [("signal-to-noise", "SNR"), ("snr", "SNR"), ("rssi", "RSSI"), ("signal", "RSSI"),
         ("packet error", "Packet error rate"), ("error rate", "Packet error rate"),
         ("retr", "Retries"), ("busy", "Channel busy ratio"), ("jitter", "Jitter")]
WORDS = {"RSSI": ["rssi", "signal"], "SNR": ["snr", "noise"], "Packet error rate": ["packet", "error"],
         "Retries": ["retr"], "Channel busy ratio": ["busy", "channel"], "Jitter": ["jitter"]}

def metric_of(clause):
    for k, n in ORDER:
        if k in clause:
            return n

def check(s, out, F):
    text = out["reason"] + " " + out["recommendation"]
    low = text.lower()
    flags = []
    for c in re.split(r"[.;,]| and ", low):
        n = metric_of(c)
        if not n:
            continue
        lab = F[n][1]
        sn = n in ("RSSI", "SNR")
        if lab == "ok":
            bad = ("weak", "poor", "low", "degrad") if sn else ("high", "elevated", "poor", "weak", "degrad")
            if any(w in c for w in bad):
                flags.append(f"calls ok {n} a problem: '{c.strip()[:50]}'")
        else:
            good = ["stable", "healthy", "minimal", "acceptable", "normal", "fine", "good", "no issue", "within"]
            good += ["high", "strong"] if sn else ["low", "small", "few"]
            if any(w in c for w in good):
                flags.append(f"{n} is {lab} but sounds fine: '{c.strip()[:50]}'")
    allowed = set()
    for k in ("rssi", "snr", "per", "retries", "busy", "jitter"):
        allowed.add(str(abs(s[k])))
    for x in re.findall(r"\d+(?:\.\d+)?", text):
        if x not in allowed:
            flags.append(f"number not in telemetry: {x}")
    for n, (v, lab) in F.items():
        if lab != "ok" and not any(w in low for w in WORDS[n]):
            flags.append(f"omits {n} ({lab})")
    if MUST_SAY[s["cls"]] not in low:
        flags.append(f"recommendation lacks '{MUST_SAY[s['cls']]}'")
    return flags

schema = {"type": "object", "properties": {"reason": {"type": "string"},
          "recommendation": {"type": "string"}}, "required": ["reason", "recommendation"]}

def ask(model, prompt):
    r = requests.post("http://localhost:11434/api/chat", json={
        "model": model, "messages": [{"role": "user", "content": prompt}],
        "format": schema, "stream": False, "think": False,
        "options": {"temperature": 0}}, timeout=600)
    return json.loads(r.json()["message"]["content"])

results = {}
for model in MODELS:
    ask(model, 'Reply with {"reason":"ok","recommendation":"ok"}')  # warm-up, not timed
    rows = []
    for s in SCENARIOS:
        F = facts(s)
        ft = "\n".join(f"- {k}: {v} ({lab})" for k, (v, lab) in F.items())
        prompt = f"""You are the ResQMesh network operations assistant.
Explain this network event in simple language, in 2-3 sentences.
Use ONLY the facts below, with their labels. Never call a metric good, stable,
acceptable or minimal unless its label is "ok". Do not add numbers.
Do not change the decision.

Facts:
{ft}

TinyML classifier output: {s['cls']}
Decision (fixed): {DECISION[s['cls']]}

Write "reason" and "recommendation". The recommendation must restate the fixed decision in plain words."""
        t0 = time.time()
        out = ask(model, prompt)
        secs = time.time() - t0
        out["severity"] = SEVERITY[s["cls"]]
        flags = check(s, out, F)
        rows.append({"scenario": s["id"], "secs": round(secs, 1), "flags": flags, "output": out})
        print(f"{model:12} {s['id']:24} {len(flags)} flags  {secs:.1f}s")
        for f in flags:
            print("      -", f)
    results[model] = rows

print("\n=== SUMMARY ===")
print(f"{'model':12} {'clean':>7} {'total flags':>12} {'avg secs':>9}")
for m, rows in results.items():
    clean = sum(1 for r in rows if not r["flags"])
    tot = sum(len(r["flags"]) for r in rows)
    avg = sum(r["secs"] for r in rows) / len(rows)
    print(f"{m:12} {clean}/{len(rows):<5} {tot:>12} {avg:>9.1f}")
json.dump(results, open("results.json", "w"), indent=2)
print("\nSaved results.json")
