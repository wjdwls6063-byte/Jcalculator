from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Any

import quickjs


ENGINE_DIR = Path(__file__).resolve().parent.parent / "js_engines"


class ServerJavaScriptEngine:
    """Run an extracted original calculation engine inside each worker thread."""

    def __init__(self, filename: str) -> None:
        self._source = (ENGINE_DIR / filename).read_text(encoding="utf-8")
        self._local = threading.local()

    def _context(self) -> quickjs.Context:
        context = getattr(self._local, "context", None)
        if context is None:
            context = quickjs.Context()
            context.eval(self._source)
            self._local.context = context
        return context

    def call(self, function_name: str, payload: dict[str, Any] | None = None) -> Any:
        function = self._context().get(function_name)
        if function is None:
            raise RuntimeError(f"Server engine function not found: {function_name}")
        if payload is None:
            raw = function()
        else:
            raw = function(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
        return json.loads(raw)


conveyor_engine = ServerJavaScriptEngine("conveyor_engine.js")
eccentric_engine = ServerJavaScriptEngine("eccentric_engine.js")
smc_engine = ServerJavaScriptEngine("smc_engine.js")
