#!/usr/bin/env python3
import asyncio
import websockets


async def check_server():
    try:
        async with websockets.connect("ws://localhost:9000") as websocket:
            return True
    except:
        return False


if __name__ == "__main__":
    result = asyncio.run(check_server())
    exit(0 if result else 1)

