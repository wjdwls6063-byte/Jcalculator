from __future__ import annotations

import secrets

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse, Response

from .settings import api_keys


class APIKeyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if request.method == "OPTIONS" or not request.url.path.startswith("/api/"):
            return await call_next(request)

        configured = api_keys()
        if not configured:
            return JSONResponse(
                {"detail": "서버 API 키가 설정되지 않았습니다."},
                status_code=503,
            )

        supplied = request.headers.get("X-API-Key", "")
        matched_name = next(
            (
                name
                for name, expected in configured.items()
                if supplied and secrets.compare_digest(supplied, expected)
            ),
            None,
        )
        if matched_name is None:
            return JSONResponse(
                {"detail": "유효한 X-API-Key가 필요합니다."},
                status_code=401,
            )

        request.state.api_key_name = matched_name
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        return response
