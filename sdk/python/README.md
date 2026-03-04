# alexza-ai

Official Python SDK for ALEXZA AI.

## Install

```bash
pip install alexza-ai
```

## Usage

```python
from alexza_ai import Alexza

client = Alexza("axza_live_your_api_key")

result = client.run(
    project="507f1f77bcf86cd799439011",
    action="summarize_text",
    input_data={"text": "Long text to summarize..."},
)

print(result["output"])
print(result.get("usage", {}).get("tokens"))
```

## API

### `Alexza(api_key, base_url=None)`

- `api_key` - Your API key (required)
- `base_url` - API base URL (default: `https://api.alexza.ai` or `ALEXZA_API_URL` env)

### `client.run(project, action, input_data)`

- `project` - Project ID
- `action` - Action name
- `input_data` - Input dict matching the action's schema

Returns: `dict` with `ok`, `requestId`, `output`, `creditsCharged`, `usage`, `latencyMs`

### Error handling

```python
from alexza_ai import Alexza, AlexzaError

try:
    result = client.run(project, action, input_data)
except AlexzaError as e:
    print(e.message, e.status, e.code)
```
