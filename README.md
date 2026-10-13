# Targeted Therapy Resistance Agent

[Open browser demonstration source →](./web/index.html)

A research prototype containing deterministic **generic threshold demonstrations** and three Python entry points for synthetic evaluations. Despite the name, it does **not** identify oncogenic variants, detect EGFR or ALK resistance mutations, predict molecular escape pathways, or recommend evidence-based targeted treatments.

**Demonstration only, not clinical decision support.** Numeric boundaries are illustrative and are not published oncology resistance thresholds. Do not enter patient information or use results for clinical decisions.

## Browser demonstration

Open [web/index.html](web/index.html) locally. The repository root [index.html](index.html) redirects into the web app when GitHub Pages serves the repository root.

The browser demo evaluates the generic rules found in agents/workers.py (primary metric greater than 25, secondary metric greater than 12, synthetic critical flag, and selected descriptor keywords). It displays the alerts and allows downloading result JSON. It is JavaScript-only, makes **no HTTP requests**, and stores nothing on a server. No Pyodide is necessary for this small demonstration; browser results do not generate server-side HMAC audit records.

## Python installation

Python 3.10 or newer:

~~~bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -e ".[server,test]"
~~~

On Windows, activate with .venv\Scripts\activate.

These **distinct** interfaces currently have different thresholds and result formats:

| Interface | Example command | Rule thresholds |
| --- | --- | --- |
| Main supervisor | python cli.py audit --task-id DEMO-01 --target SYNTH-01 --primary 28 --secondary 14 | Primary 25, secondary 12 |
| Packaged CLI | targeted-therapy-resistance-engine audit --case-id DEMO-01 --primary 26 --secondary 12 --status NORMAL | Primary 20, secondary 10 |
| Legacy sentinel | python resistome_sentinel.py audit --case-id DEMO-01 --primary 24 --secondary 8 | Primary 20, secondary 12 |

**Do not treat the interfaces as interchangeable clinical algorithms.**

To run the main CLI batch mode or its in-memory HMAC audit log:

~~~bash
export AUDIT_SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(32))')"
python cli.py batch --input your_synthetic_data.csv --output results.csv
python cli.py verify-audit
~~~

The audit key must be at least 16 characters. Never commit it. The in-memory HMAC-SHA256 chain detects modified signed entries but provides neither durable logs nor evidence that entries have not been deleted or truncated.

## API and containers

Run python cli.py serve for a local FastAPI API on http://127.0.0.1:8000. API docs are at /docs. Main routes are POST /api/audit, POST /api/chat, GET /health, GET /metrics and GET /api/audit/logs.

For Docker Compose, set AUDIT_SECRET_KEY in your local environment and run docker compose up --build. Compose now rejects a missing key.

**Do not expose the backend to untrusted networks.** It has no authentication, persistent datastore, or complete PHI de-identification. The regex checks on identifiers and nested attributes cannot establish HIPAA compliance. Use synthetic data only.

## Tests

~~~bash
python -m pytest -q
node --check web/app.js
node --test tests/web.test.cjs
~~~

GitHub Actions tests Python 3.10–3.12 as well as the browser rules. The repository includes a synthetic sample CSV and an illustrative simulation: python simulator.py 100.

## Scope, technology and license

The mock LLM is a deterministic response stub; no live external-model inference is implemented. This project has no validated clinical accuracy, calibration, therapy selection, or treatment-response prediction. Browser rules are plain JavaScript. The backend uses Python, Pydantic 2 and optional FastAPI/Uvicorn. The browser demonstration targets modern mobile and desktop browsers; server-side Python is not supported on GitHub Pages.

License: [MIT](LICENSE).
