from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class BallscrewInputs(BaseModel):
    model_config = ConfigDict(extra="forbid")

    axisMode: Literal["horizontal", "vertical"] = "horizontal"
    couplingSeries: Literal["auto", "SD", "SDW"] = "auto"
    motorId: str = "HG-KR43"
    reducerRatio: float = Field(default=3, gt=0)
    massKg: float = Field(default=80, ge=0)
    strokeMm: float = Field(default=500, ge=0)
    maxSpeedMmS: float = Field(default=250, ge=0)
    accelTimeS: float = Field(default=0.2, gt=0)
    dwellTimeS: float = Field(default=0.2, ge=0)
    cyclesPerMin: float = Field(default=10, ge=0)
    externalResistanceN: float = Field(default=50, ge=0)
    counterbalanceForceN: float = Field(default=0, ge=0)
    verticalProcessForceN: float = Field(default=0, ge=0)
    emergencyStopTimeS: float = Field(default=0.15, gt=0)
    brakeSafetyFactor: float = Field(default=2, ge=1)
    serviceFactor: float = Field(default=1.8, ge=1)
    screwDiameterMm: float = Field(default=20, gt=0)
    screwLeadMm: float = Field(default=20, gt=0)
    screwSelectionMode: Literal["auto", "manual"] = "manual"
    screwSeries: str = "BNK-K"
    screwModelId: str = "BNK2020K-3.6"
    supportSpanMm: float = Field(default=700, gt=0)
    screwLengthMm: float = Field(default=900, gt=0)
    railCount: float = Field(default=2, ge=1, le=4)
    blocksPerRail: float = Field(default=2, ge=1, le=4)
    railSpacingMm: float = Field(default=300, ge=0)
    blockSpacingMm: float = Field(default=250, ge=0)
    tableWidthMm: float = Field(default=450, gt=0)
    cogXmm: float = 0
    cogYmm: float = 0
    cogZmm: float = 120
    screwYmm: float = 0
    screwZmm: float = 40
    shock: Literal["low", "normal", "high", "severe"] = "normal"
    lmPreload: str = "normal"
    lmAccuracy: str = "normal"
    guideSelectionMode: Literal["auto", "manual"] = "manual"
    guideSeries: str = "HSR"
    guideModelId: str = "HSR25C"
    targetLifeHours: float = Field(default=20_000, ge=0)
    safetyGoal: Literal["standard", "safe", "extra"] = "safe"
    externalFxN: float = 0
    externalFyN: float = 0
    externalFzN: float = 0
    externalPointXmm: float = 0
    externalPointYmm: float = 0
    externalPointZmm: float = 0
    dwellHoldMode: Literal["brake", "servo"] = "brake"
    gearSizePin: int = Field(default=0, ge=0)


class ConveyorInputs(BaseModel):
    model_config = ConfigDict(extra="forbid")

    load: float = Field(default=20, ge=0)
    angle: float = Field(default=0, ge=-90, le=90)
    pmotor: float = Field(default=90, ge=0)
    rpm: float = Field(default=1500, ge=0)
    ratio: float = Field(default=30, gt=0)
    pulley: float = Field(default=50, gt=0)
    center: float = Field(default=1000, gt=0)
    width: float = Field(default=300, gt=0)
    support: Literal["slider", "uhmw", "hybrid", "roller", "bearing", "custom"] = "slider"
    pitch: float = Field(default=200, gt=0)
    sf: float = Field(default=3.0, gt=0)
    eff: float = Field(default=0.8, gt=0, le=1)
    cmu: float = Field(default=0.2, gt=0, le=1)


class EccentricInputs(BaseModel):
    """The eccentric page has catalog and manual-entry variants, so fields remain flexible."""

    model_config = ConfigDict(extra="allow")

    m: float = Field(ge=0)
    e: float = Field(ge=0)
    shape: Literal["disk", "rect", "direct"]
    orient: Literal["v", "h"]
    drive: Literal["direct", "belt11", "belt"]
    gmk: str
    gsz: float
    grt: float
    motorId: str | None = None
    mo: dict[str, Any] | None = None


class SmcCylinderInputs(BaseModel):
    model_config = ConfigDict(extra="allow")
