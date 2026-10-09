from __future__ import annotations

from pathlib import Path
from typing import Any

import quickjs
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError

from .admin_api import router as admin_router
from .config_schema import deep_merge, default_config, public_config
from .engines.ballscrew import calculate as calculate_ballscrew
from .engines.ballscrew import auto_select as auto_select_ballscrew
from .engines.ballscrew import catalog as ballscrew_catalog
from .engines.ballscrew import json_safe
from .engines.server_js import conveyor_engine, eccentric_engine, smc_engine
from .models import BallscrewInputs, ConveyorInputs, EccentricInputs, SmcCylinderInputs
from .schedule_api import router as schedule_router
from .settings import allowed_origins
from .store import StoreUnavailable, iso_now, store


app = FastAPI(
    title="Jcalculator Calculation API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-CSRF-Token"],
)


@app.middleware("http")
async def security_headers(request: Any, call_next: Any) -> Any:
    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    if request.url.path.startswith("/admin"):
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "same-origin"
        response.headers["Content-Security-Policy"] = "frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@app.get("/health", tags=["system"])
def health() -> JSONResponse:
    try:
        store.current()
    except StoreUnavailable:
        return JSONResponse({"status": "error", "database": "unavailable"}, status_code=503)
    return JSONResponse({"status": "ok", "database": "ok"})


def runtime_state() -> dict[str, Any]:
    try:
        return store.current()
    except StoreUnavailable:
        return {
            "version": 0,
            "config": default_config(),
            "updatedAt": iso_now(),
            "updatedBy": "fallback",
        }


def tool_defaults(tool_id: str) -> dict[str, Any]:
    state = runtime_state()
    return dict(state["config"]["tools"].get(tool_id, {}).get("defaults", {}))


def tool_thresholds(tool_id: str) -> dict[str, Any]:
    state = runtime_state()
    return dict(state["config"]["tools"].get(tool_id, {}).get("thresholds", {}))


def validated(model: Any, tool_id: str, payload: dict[str, Any]) -> Any:
    try:
        return model.model_validate(deep_merge(tool_defaults(tool_id), payload))
    except ValidationError as error:
        raise HTTPException(status_code=422, detail=error.errors(include_url=False)) from error


@app.get("/api/public/config", tags=["system"])
def get_public_config() -> JSONResponse:
    state = runtime_state()
    return JSONResponse(public_config(state["config"], state["version"], state["updatedAt"]))


def engine_call(engine: Any, function_name: str, payload: dict[str, Any] | None = None) -> JSONResponse:
    try:
        return JSONResponse(engine.call(function_name, payload))
    except (quickjs.JSException, ValueError) as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.get("/api/conveyor/catalog", tags=["conveyor"])
def get_conveyor_catalog() -> JSONResponse:
    body = conveyor_engine.call("conveyorCatalogJSON")
    body["adminDefaults"] = tool_defaults("conveyor")
    body["adminThresholds"] = tool_thresholds("conveyor")
    return JSONResponse(body)


@app.post("/api/conveyor", tags=["conveyor"])
def conveyor(payload: dict[str, Any]) -> JSONResponse:
    inputs = validated(ConveyorInputs, "conveyor", payload)
    engine_payload = inputs.model_dump()
    engine_payload.update(tool_thresholds("conveyor"))
    return engine_call(conveyor_engine, "conveyorCalculateJSON", engine_payload)


@app.get("/api/ballscrew/catalog", tags=["ballscrew"])
def get_ballscrew_catalog(
    axis: str = Query(default="horizontal", pattern="^(horizontal|vertical)$"),
) -> JSONResponse:
    body = ballscrew_catalog(axis)
    tool_id = f"ballscrew-{axis}"
    body["defaults"] = deep_merge(body["defaults"], tool_defaults(tool_id))
    if axis == "horizontal":
        body["horizontalDefaults"] = deep_merge(body["horizontalDefaults"], tool_defaults(tool_id))
    else:
        body["verticalDefaults"] = deep_merge(body["verticalDefaults"], tool_defaults(tool_id))
    body["adminThresholds"] = tool_thresholds(tool_id)
    return JSONResponse(json_safe(body))


@app.post("/api/ballscrew", tags=["ballscrew"])
def ballscrew(payload: dict[str, Any]) -> JSONResponse:
    inputs = validated(BallscrewInputs, "ballscrew-horizontal", payload)
    result = calculate_ballscrew(inputs.model_dump(), axis_mode="horizontal")
    result["adminThresholds"] = tool_thresholds("ballscrew-horizontal")
    return JSONResponse(json_safe(result))


@app.post("/api/ballscrew/vertical", tags=["ballscrew"])
def ballscrew_vertical(payload: dict[str, Any]) -> JSONResponse:
    inputs = validated(BallscrewInputs, "ballscrew-vertical", payload)
    result = calculate_ballscrew(inputs.model_dump(), axis_mode="vertical")
    result["adminThresholds"] = tool_thresholds("ballscrew-vertical")
    return JSONResponse(json_safe(result))


@app.post("/api/ballscrew/auto-select", tags=["ballscrew"])
def ballscrew_auto_select(payload: dict[str, Any]) -> JSONResponse:
    axis = "vertical" if payload.get("axisMode") == "vertical" else "horizontal"
    inputs = validated(BallscrewInputs, f"ballscrew-{axis}", payload)
    thresholds = tool_thresholds(f"ballscrew-{axis}")
    result = auto_select_ballscrew(inputs.model_dump(), float(thresholds.get("autoSelectMargin", 0.30)))
    result["adminThresholds"] = thresholds
    return JSONResponse(json_safe(result))


@app.get("/api/eccentric/catalog", tags=["eccentric"])
def get_eccentric_catalog() -> JSONResponse:
    body = eccentric_engine.call("eccentricCatalogJSON")
    body["adminDefaults"] = tool_defaults("eccentric")
    body["adminThresholds"] = tool_thresholds("eccentric")
    return JSONResponse(body)


@app.post("/api/eccentric", tags=["eccentric"])
def eccentric(payload: dict[str, Any]) -> JSONResponse:
    inputs = validated(EccentricInputs, "eccentric", payload)
    engine_payload = inputs.model_dump(exclude_none=True)
    engine_payload.update(tool_thresholds("eccentric"))
    return engine_call(eccentric_engine, "eccentricCalculateJSON", engine_payload)


@app.post("/api/eccentric/auto-select", tags=["eccentric"])
def eccentric_auto_select(payload: dict[str, Any]) -> JSONResponse:
    inputs = validated(EccentricInputs, "eccentric", payload)
    engine_payload = inputs.model_dump(exclude_none=True)
    engine_payload.update(tool_thresholds("eccentric"))
    return engine_call(eccentric_engine, "eccentricSearchJSON", engine_payload)


@app.get("/api/smc-cylinder/catalog", tags=["smc-cylinder"])
def get_smc_catalog() -> JSONResponse:
    body = smc_engine.call("smcCatalogJSON")
    body["adminDefaults"] = tool_defaults("smc-cylinder")
    body["adminThresholds"] = tool_thresholds("smc-cylinder")
    body["catalogOverrides"] = runtime_state()["config"]["catalogOverrides"]["smc-cylinder"]
    return JSONResponse(body)


@app.post("/api/smc-cylinder", tags=["smc-cylinder"])
def smc_cylinder(payload: dict[str, Any]) -> JSONResponse:
    inputs = validated(SmcCylinderInputs, "smc-cylinder", payload)
    return engine_call(smc_engine, "smcResolveJSON", inputs.model_dump())


app.include_router(admin_router)
app.include_router(schedule_router)

FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend"
if FRONTEND_DIR.is_dir():
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
