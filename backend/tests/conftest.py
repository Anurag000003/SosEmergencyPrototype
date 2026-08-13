import pytest
from fastapi.testclient import TestClient
import sys
import os

# Add src to sys.path so we can import the FastAPI app
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "src"))
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from main import app

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c
