from __future__ import annotations

from typing import Any

import quickjs
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .engines.ballscrew import calculate as calculate_ballscrew
from .engines.ballscrew import auto_select as auto_select_ballscrew
from .engines.ballscrew import catalog as ballscrew_catalog
from .engines.ballscrew import json_safe
from .engines.server_js import conveyor_engine, eccentric_engine, smc_engine
from .models import BallscrewInputs, ConveyorInputs, EccentricInputs, SmcCylinderInputs
from .security import APIKeyMiddleware
from .settings import allowed_origins


app = FastAPI(
    title="Jcalculator Calculation API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None,
)

# Authentication is added first so CORS remains the outer middleware and also
# decorates 401/503 responses returned before a route handler runs.
app.add_middleware(APIKeyMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-API-Key"],
)


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok"}


def engine_call(engine: Any, function_name: str, payload: dict[str, Any] | None = None) -> JSONResponse:
    try:
        return JSONResponse(engine.call(function_name, payload))
    except (quickjs.JSException, ValueError) as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.get("/api/conveyor/catalog", tags=["conveyor"])
def get_conveyor_catalog() -> JSONResponse:
    return engine_call(conveyor_engine, "conveyorCatalogJSON")


@app.post("/api/conveyor", tags=["conveyor"])
def conveyor(inputs: ConveyorInputs) -> JSONResponse:
    return engine_call(conveyor_engine, "conveyorCalculateJSON", inputs.model_dump())


@app.get("/api/ballscrew/catalog", tags=["ballscrew"])
def get_ballscrew_catalog(
    axis: str = Query(default="horizontal", pattern="^(horizontal|vertical)$"),
) -> JSONResponse:
    return JSONResponse(json_safe(ballscrew_catalog(axis)))


@app.post("/api/ballscrew", tags=["ballscrew"])
def ballscrew(inputs: BallscrewInputs) -> JSONResponse:
    result = calculate_ballscrew(inputs.model_dump(), axis_mode="horizontal")
    return JSONResponse(json_safe(result))


@app.post("/api/ballscrew/vertical", tags=["ballscrew"])
def ballscrew_vertical(inputs: BallscrewInputs) -> JSONResponse:
    result = calculate_ballscrew(inputs.model_dump(), axis_mode="vertical")
    return JSONResponse(json_safe(result))


@app.post("/api/ballscrew/auto-select", tags=["ballscrew"])
def ballscrew_auto_select(inputs: BallscrewInputs) -> JSONResponse:
    result = auto_select_ballscrew(inputs.model_dump())
    return JSONResponse(json_safe(result))


@app.get("/api/eccentric/catalog", tags=["eccentric"])
def get_eccentric_catalog() -> JSONResponse:
    return engine_call(eccentric_engine, "eccentricCatalogJSON")


@app.post("/api/eccentric", tags=["eccentric"])
def eccentric(inputs: EccentricInputs) -> JSONResponse:
    return engine_call(eccentric_engine, "eccentricCalculateJSON", inputs.model_dump(exclude_none=True))


@app.post("/api/eccentric/auto-select", tags=["eccentric"])
def eccentric_auto_select(inputs: EccentricInputs) -> JSONResponse:
    return engine_call(eccentric_engine, "eccentricSearchJSON", inputs.model_dump(exclude_none=True))


@app.get("/api/smc-cylinder/catalog", tags=["smc-cylinder"])
def get_smc_catalog() -> JSONResponse:
    return engine_call(smc_engine, "smcCatalogJSON")


@app.post("/api/smc-cylinder", tags=["smc-cylinder"])
def smc_cylinder(inputs: SmcCylinderInputs) -> JSONResponse:
    return engine_call(smc_engine, "smcResolveJSON", inputs.model_dump())
