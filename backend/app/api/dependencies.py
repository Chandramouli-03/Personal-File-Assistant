"""
FastAPI dependencies for the Personal Assistant API.
These are singleton instances managed by the application.
"""

# Global instances - set by main.py during startup
_file_scanner = None
_file_search = None
_ai_orchestrator = None
_device_manager = None
_discovery_service = None
_file_transfer = None


def set_file_scanner(scanner):
    global _file_scanner
    _file_scanner = scanner


def get_file_scanner():
    return _file_scanner


def set_file_search(search):
    global _file_search
    _file_search = search


def get_file_search():
    return _file_search


def set_ai_orchestrator(orchestrator):
    global _ai_orchestrator
    _ai_orchestrator = orchestrator


def get_ai_orchestrator():
    return _ai_orchestrator


def set_device_manager(manager):
    global _device_manager
    _device_manager = manager


def get_device_manager():
    return _device_manager


def set_discovery_service(discovery):
    global _discovery_service
    _discovery_service = discovery


def get_discovery_service():
    return _discovery_service


def set_file_transfer(transfer):
    global _file_transfer
    _file_transfer = transfer


def get_file_transfer():
    return _file_transfer
