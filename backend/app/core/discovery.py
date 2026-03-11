import asyncio
import json
import socket
import platform
from datetime import datetime
from typing import Callable, Optional
import logging

from ..config import settings
from ..models.device import DiscoveryBroadcast, DeviceMode

logger = logging.getLogger(__name__)


def get_local_ip() -> str:
    """Get the local IP address"""
    try:
        # Create a socket to determine local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception:
        return "127.0.0.1"


class DiscoveryService:
    """
    UDP-based device discovery service.

    Primary devices broadcast their presence.
    Agent devices listen for broadcasts and can register.
    """

    def __init__(
        self,
        device_id: str,
        device_name: str,
        port: int = None,
        mode: DeviceMode = DeviceMode.PRIMARY,
        on_device_discovered: Optional[Callable] = None,
    ):
        self.device_id = device_id
        self.device_name = device_name
        self.port = port or settings.port
        self.mode = mode
        self.discovery_port = settings.discovery_port
        self.on_device_discovered = on_device_discovered

        self._running = False
        self._broadcast_task: Optional[asyncio.Task] = None
        self._listen_task: Optional[asyncio.Task] = None
        self._discovered_devices: dict[str, dict] = {}

    @property
    def local_ip(self) -> str:
        return get_local_ip()

    @property
    def base_url(self) -> str:
        return f"http://{self.local_ip}:{self.port}"

    def _create_broadcast_message(self) -> str:
        """Create the discovery broadcast message"""
        message = DiscoveryBroadcast(
            type="discovery",
            name=self.device_name,
            url=self.base_url,
            device_id=self.device_id,
            mode=self.mode,
        )
        return json.dumps(message.model_dump())

    async def start_broadcast(self):
        """Start broadcasting presence (for primary devices)"""
        if self.mode != DeviceMode.PRIMARY:
            logger.info("Only primary devices broadcast")
            return

        self._running = True
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

        message = self._create_broadcast_message()
        logger.info(f"Starting discovery broadcast on port {self.discovery_port}")

        while self._running:
            try:
                sock.sendto(message.encode(), ("<broadcast>", self.discovery_port))
                logger.debug(f"Broadcast sent: {self.base_url}")
            except Exception as e:
                logger.error(f"Broadcast error: {e}")

            await asyncio.sleep(settings.heartbeat_interval)

        sock.close()

    async def start_listening(self):
        """Start listening for discovery broadcasts (for agent devices)"""
        self._running = True
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind(("0.0.0.0", self.discovery_port))
        sock.setblocking(False)

        logger.info(f"Listening for discovery broadcasts on port {self.discovery_port}")

        loop = asyncio.get_event_loop()

        while self._running:
            try:
                data, addr = await loop.sock_recvfrom(sock, 4096)
                message = json.loads(data.decode())

                if message.get("type") == "discovery":
                    device_url = message.get("url")
                    device_name = message.get("name")
                    device_id = message.get("device_id")

                    # Skip our own broadcasts
                    if device_id == self.device_id:
                        continue

                    logger.info(f"Discovered device: {device_name} at {device_url}")

                    # Store discovered device
                    self._discovered_devices[device_id] = {
                        "name": device_name,
                        "url": device_url,
                        "device_id": device_id,
                        "discovered_at": datetime.now().isoformat(),
                        "ip": addr[0],
                    }

                    # Callback if provided
                    if self.on_device_discovered:
                        await self.on_device_discovered(self._discovered_devices[device_id])

            except json.JSONDecodeError:
                logger.warning("Received invalid JSON in discovery")
            except Exception as e:
                if self._running:
                    logger.error(f"Discovery listen error: {e}")
                await asyncio.sleep(1)

        sock.close()

    async def start(self):
        """Start the discovery service"""
        if self.mode == DeviceMode.PRIMARY:
            self._broadcast_task = asyncio.create_task(self.start_broadcast())
        else:
            self._listen_task = asyncio.create_task(self.start_listening())

    async def stop(self):
        """Stop the discovery service"""
        self._running = False

        if self._broadcast_task:
            self._broadcast_task.cancel()
            try:
                await self._broadcast_task
            except asyncio.CancelledError:
                pass

        if self._listen_task:
            self._listen_task.cancel()
            try:
                await self._listen_task
            except asyncio.CancelledError:
                pass

    def get_discovered_devices(self) -> list[dict]:
        """Get list of discovered devices"""
        return list(self._discovered_devices.values())
