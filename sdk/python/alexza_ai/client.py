"""
ALEXZA AI Python SDK - Client implementation
"""

from typing import Any, Dict, Optional
from urllib.parse import quote

import requests

DEFAULT_BASE_URL = "https://api.alexza.ai"


class AlexzaError(Exception):
    """Structured error from the ALEXZA API."""

    def __init__(
        self,
        message: str,
        status: int,
        code: Optional[str] = None,
        request_id: Optional[str] = None,
    ):
        super().__init__(message)
        self.message = message
        self.status = status
        self.code = code
        self.request_id = request_id

    def __str__(self) -> str:
        parts = [self.message]
        if self.code:
            parts.append(f" (code: {self.code})")
        if self.request_id:
            parts.append(f" [requestId: {self.request_id}]")
        return "".join(parts)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "message": self.message,
            "status": self.status,
            "code": self.code,
            "requestId": self.request_id,
        }


class Alexza:
    """ALEXZA AI client for running actions."""

    def __init__(self, api_key: str, base_url: Optional[str] = None):
        """
        Args:
            api_key: API key (e.g. axza_live_...)
            base_url: API base URL (default: https://api.alexza.ai or ALEXZA_API_URL env)
        """
        if not api_key or not isinstance(api_key, str) or not api_key.strip():
            raise AlexzaError("API key is required", 0)
        self._api_key = api_key.strip()
        import os

        url = base_url or os.environ.get("ALEXZA_API_URL") or DEFAULT_BASE_URL
        self._base_url = url.rstrip("/")

    def run(
        self,
        project: str,
        action: str,
        input_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Run an action.

        Args:
            project: Project ID (MongoDB ObjectId)
            action: Action name
            input_data: Input object matching the action's inputSchema

        Returns:
            Run response with output, usage, etc.
        """
        if not project or not action:
            raise AlexzaError("project and action are required", 0)
        if not input_data or not isinstance(input_data, dict):
            raise AlexzaError("input must be a dict", 0)

        url = f"{self._base_url}/v1/projects/{quote(project, safe='')}/run/{quote(action, safe='')}"
        headers = {
            "Content-Type": "application/json",
            "x-api-key": self._api_key,
        }
        body = {"input": input_data}

        try:
            response = requests.post(url, json=body, headers=headers, timeout=120)
        except requests.RequestException as e:
            raise AlexzaError(str(e), 0) from e

        try:
            data = response.json()
        except ValueError:
            raise AlexzaError(
                f"Request failed with status {response.status_code}",
                response.status_code,
            )

        if not response.ok:
            err = data.get("error") if isinstance(data, dict) else None
            message = (
                err.get("message") if isinstance(err, dict) and err.get("message") else None
            ) or data.get("message") or data.get("error") or f"Request failed with status {response.status_code}"
            if isinstance(message, dict):
                message = message.get("message", str(message))
            code = err.get("code") if isinstance(err, dict) else None
            request_id = data.get("requestId") if isinstance(data, dict) else None
            raise AlexzaError(
                str(message),
                response.status_code,
                code=code,
                request_id=request_id,
            )

        return data
