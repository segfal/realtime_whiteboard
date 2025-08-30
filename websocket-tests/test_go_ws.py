#!/usr/bin/env python3
import asyncio
import json
import os
import sys

import websockets


WS_URL = os.environ.get("GO_WS_URL", "ws://localhost:8080/ws")
ROOM = os.environ.get("GO_WS_ROOM", "hackathon-room")


async def expect_type(ws, expected_types, timeout=5):
    try:
        msg = await asyncio.wait_for(ws.recv(), timeout=timeout)
    except asyncio.TimeoutError:
        raise AssertionError(f"Timed out waiting for message types {expected_types}")
    data = json.loads(msg)
    if isinstance(expected_types, str):
        expected_types = [expected_types]
    if data.get("type") not in expected_types:
        raise AssertionError(f"Expected type {expected_types}, got {data.get('type')}: {data}")
    return data


async def main():
    print(f"Connecting to {WS_URL}...")
    async with websockets.connect(WS_URL) as ws:
        # Join
        await ws.send(json.dumps({"type": "join", "room": ROOM}))
        joined = await expect_type(ws, "joined")
        print("Joined:", joined.get("username"))

        # Send stroke
        stroke = {
            "type": "stroke",
            "room": ROOM,
            "username": joined.get("username", "unknown"),
            "data": {
                "points": [[10, 10], [20, 20], [30, 15]],
                "color": "#00ff00",
                "thickness": 2,
                "isEraser": False,
                "client_version": 0,
            },
        }
        await ws.send(json.dumps(stroke))
        operation = await expect_type(ws, "operation")
        assert operation.get("data", {}).get("operation"), f"Invalid operation payload: {operation}"
        print("Received operation with version:", operation["data"]["operation"].get("version"))

        # Chat
        await ws.send(json.dumps({
            "type": "chat:message",
            "room": ROOM,
            "username": joined.get("username", "unknown"),
            "data": {"message": "hello", "timestamp": "now"}
        }))
        chat = await expect_type(ws, "chat:message")
        print("Received chat:", chat.get("data"))

        # Clear
        await ws.send(json.dumps({
            "type": "clear",
            "room": ROOM,
            "username": joined.get("username", "unknown"),
        }))
        # The clear is published via Redis; allow either clear or operation next, but try to read a few messages
        got_clear = False
        for _ in range(3):
            msg = await expect_type(ws, ["clear", "operation"], timeout=5)
            if msg.get("type") == "clear":
                got_clear = True
                print("Received clear")
                break
        if not got_clear:
            raise AssertionError("Did not receive clear broadcast")

        print("All checks passed.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as e:
        print("TEST FAILED:", e)
        sys.exit(1)
    sys.exit(0)




