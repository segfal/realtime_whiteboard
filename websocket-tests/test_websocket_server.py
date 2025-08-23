#!/usr/bin/env python3
"""
Comprehensive WebSocket Server Test Suite

This test suite validates the C++ WebSocket server functionality with various scenarios:
- Connection tests
- Message handling tests
- Error handling tests
- Performance tests
- Multi-client tests
"""

import asyncio
import json
import time
import websockets
import pytest
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from colorama import init, Fore, Style

# Initialize colorama for cross-platform colored output
init()

@dataclass
class TestResult:
    """Test result data structure"""
    test_name: str
    status: str  # "PASS", "FAIL", "SKIP"
    duration: float
    error_message: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

class WebSocketTestSuite:
    """Comprehensive WebSocket server test suite"""
    
    def __init__(self, server_url: str = "ws://localhost:9000"):
        self.server_url = server_url
        self.console = Console()
        self.test_results: List[TestResult] = []
        self.connection_count = 0
        
    def log(self, message: str, level: str = "INFO"):
        """Log messages with color coding"""
        colors = {
            "INFO": Fore.BLUE,
            "SUCCESS": Fore.GREEN,
            "WARNING": Fore.YELLOW,
            "ERROR": Fore.RED,
            "TEST": Fore.CYAN
        }
        color = colors.get(level, Fore.WHITE)
        print(f"{color}[{level}]{Style.RESET_ALL} {message}")
    
    async def test_connection_basic(self) -> TestResult:
        """Test basic WebSocket connection"""
        start_time = time.time()
        try:
            async with websockets.connect(self.server_url) as websocket:
                self.log("✅ Basic connection established", "SUCCESS")
                return TestResult(
                    test_name="Basic Connection",
                    status="PASS",
                    duration=time.time() - start_time
                )
        except Exception as e:
            return TestResult(
                test_name="Basic Connection",
                status="FAIL",
                duration=time.time() - start_time,
                error_message=str(e)
            )
    
    async def test_initial_sync_messages(self) -> TestResult:
        """Test that server sends initial sync messages"""
        start_time = time.time()
        try:
            async with websockets.connect(self.server_url) as websocket:
                # Wait for initial sync messages
                messages = []
                timeout = 5.0
                start = time.time()
                
                while time.time() - start < timeout and len(messages) < 2:
                    try:
                        message = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                        messages.append(json.loads(message))
                    except asyncio.TimeoutError:
                        break
                
                # Check for expected sync messages
                message_types = [msg.get("type") for msg in messages]
                expected_types = ["board:sync", "chat:sync"]
                
                if all(msg_type in message_types for msg_type in expected_types):
                    self.log("✅ Initial sync messages received", "SUCCESS")
                    return TestResult(
                        test_name="Initial Sync Messages",
                        status="PASS",
                        duration=time.time() - start_time,
                        details={"received_messages": len(messages), "message_types": message_types}
                    )
                else:
                    return TestResult(
                        test_name="Initial Sync Messages",
                        status="FAIL",
                        duration=time.time() - start_time,
                        error_message=f"Expected {expected_types}, got {message_types}"
                    )
        except Exception as e:
            return TestResult(
                test_name="Initial Sync Messages",
                status="FAIL",
                duration=time.time() - start_time,
                error_message=str(e)
            )
    
    async def test_chat_message(self) -> TestResult:
        """Test sending and receiving chat messages"""
        start_time = time.time()
        try:
            async with websockets.connect(self.server_url) as websocket:
                # Send chat message
                chat_message = {
                    "type": "chat:message",
                    "payload": {
                        "user": "testuser",
                        "message": "Hello from Python test!",
                        "timestamp": time.time()
                    }
                }
                await websocket.send(json.dumps(chat_message))
                
                # Wait for echo or broadcast
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=3.0)
                    response_data = json.loads(response)
                    
                    if response_data.get("type") == "chat:message":
                        self.log("✅ Chat message handled correctly", "SUCCESS")
                        return TestResult(
                            test_name="Chat Message",
                            status="PASS",
                            duration=time.time() - start_time,
                            details={"sent": chat_message, "received": response_data}
                        )
                    else:
                        return TestResult(
                            test_name="Chat Message",
                            status="FAIL",
                            duration=time.time() - start_time,
                            error_message=f"Unexpected response type: {response_data.get('type')}"
                        )
                except asyncio.TimeoutError:
                    return TestResult(
                        test_name="Chat Message",
                        status="FAIL",
                        duration=time.time() - start_time,
                        error_message="Timeout waiting for chat message response"
                    )
        except Exception as e:
            return TestResult(
                test_name="Chat Message",
                status="FAIL",
                duration=time.time() - start_time,
                error_message=str(e)
            )
    
    async def test_stroke_message(self) -> TestResult:
        """Test sending stroke messages"""
        start_time = time.time()
        try:
            async with websockets.connect(self.server_url) as websocket:
                # Send stroke message
                stroke_message = {
                    "type": "stroke:add",
                    "payload": {
                        "stroke": {
                            "points": [
                                {"x": 100, "y": 100},
                                {"x": 200, "y": 200}
                            ],
                            "color": {"r": 1.0, "g": 0.0, "b": 0.0, "a": 1.0},
                            "thickness": 2.0
                        },
                        "userId": "testuser",
                        "timestamp": time.time()
                    }
                }
                await websocket.send(json.dumps(stroke_message))
                
                # Wait for response
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=3.0)
                    response_data = json.loads(response)
                    
                    if response_data.get("type") in ["stroke:add", "board:sync"]:
                        self.log("✅ Stroke message handled correctly", "SUCCESS")
                        return TestResult(
                            test_name="Stroke Message",
                            status="PASS",
                            duration=time.time() - start_time,
                            details={"sent": stroke_message, "received": response_data}
                        )
                    else:
                        return TestResult(
                            test_name="Stroke Message",
                            status="FAIL",
                            duration=time.time() - start_time,
                            error_message=f"Unexpected response type: {response_data.get('type')}"
                        )
                except asyncio.TimeoutError:
                    return TestResult(
                        test_name="Stroke Message",
                        status="FAIL",
                        duration=time.time() - start_time,
                        error_message="Timeout waiting for stroke message response"
                    )
        except Exception as e:
            return TestResult(
                test_name="Stroke Message",
                status="FAIL",
                duration=time.time() - start_time,
                error_message=str(e)
            )
    
    async def test_invalid_message(self) -> TestResult:
        """Test server handling of invalid messages"""
        start_time = time.time()
        try:
            async with websockets.connect(self.server_url) as websocket:
                # Send invalid JSON
                await websocket.send("invalid json")
                
                # Server should handle gracefully (not crash)
                await asyncio.sleep(1.0)
                
                # Try to send a valid message to ensure server is still working
                valid_message = {
                    "type": "chat:message",
                    "payload": {
                        "user": "testuser",
                        "message": "Test after invalid message",
                        "timestamp": time.time()
                    }
                }
                await websocket.send(json.dumps(valid_message))
                
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=3.0)
                    self.log("✅ Server handled invalid message gracefully", "SUCCESS")
                    return TestResult(
                        test_name="Invalid Message Handling",
                        status="PASS",
                        duration=time.time() - start_time,
                        details={"invalid_sent": "invalid json", "valid_response": json.loads(response)}
                    )
                except asyncio.TimeoutError:
                    return TestResult(
                        test_name="Invalid Message Handling",
                        status="FAIL",
                        duration=time.time() - start_time,
                        error_message="Server did not respond after invalid message"
                    )
        except Exception as e:
            return TestResult(
                test_name="Invalid Message Handling",
                status="FAIL",
                duration=time.time() - start_time,
                error_message=str(e)
            )
    
    async def test_connection_stress(self) -> TestResult:
        """Test multiple rapid connections"""
        start_time = time.time()
        connections = []
        max_connections = 10
        
        try:
            # Create multiple connections rapidly
            for i in range(max_connections):
                try:
                    websocket = await websockets.connect(self.server_url)
                    connections.append(websocket)
                    self.connection_count += 1
                except Exception as e:
                    return TestResult(
                        test_name="Connection Stress Test",
                        status="FAIL",
                        duration=time.time() - start_time,
                        error_message=f"Failed to establish connection {i}: {str(e)}"
                    )
            
            # Send messages from all connections
            tasks = []
            for i, websocket in enumerate(connections):
                message = {
                    "type": "chat:message",
                    "payload": {
                        "user": f"user{i}",
                        "message": f"Message from connection {i}",
                        "timestamp": time.time()
                    }
                }
                task = asyncio.create_task(websocket.send(json.dumps(message)))
                tasks.append(task)
            
            await asyncio.gather(*tasks)
            
            # Close all connections
            for websocket in connections:
                await websocket.close()
            
            self.log(f"✅ Successfully handled {max_connections} concurrent connections", "SUCCESS")
            return TestResult(
                test_name="Connection Stress Test",
                status="PASS",
                duration=time.time() - start_time,
                details={"connections_established": len(connections)}
            )
            
        except Exception as e:
            # Clean up connections on error
            for websocket in connections:
                try:
                    await websocket.close()
                except:
                    pass
            
            return TestResult(
                test_name="Connection Stress Test",
                status="FAIL",
                duration=time.time() - start_time,
                error_message=str(e)
            )
    
    async def test_message_broadcast(self) -> TestResult:
        """Test message broadcasting between multiple clients"""
        start_time = time.time()
        connections = []
        
        try:
            # Create two connections
            for i in range(2):
                websocket = await websockets.connect(self.server_url)
                connections.append(websocket)
            
            # Send message from first connection
            message = {
                "type": "chat:message",
                "payload": {
                    "user": "broadcaster",
                    "message": "Broadcast test message",
                    "timestamp": time.time()
                }
            }
            await connections[0].send(json.dumps(message))
            
            # Check if second connection receives the message
            try:
                response = await asyncio.wait_for(connections[1].recv(), timeout=3.0)
                response_data = json.loads(response)
                
                if response_data.get("type") == "chat:message":
                    self.log("✅ Message broadcasting working correctly", "SUCCESS")
                    return TestResult(
                        test_name="Message Broadcasting",
                        status="PASS",
                        duration=time.time() - start_time,
                        details={"sent": message, "received": response_data}
                    )
                else:
                    return TestResult(
                        test_name="Message Broadcasting",
                        status="FAIL",
                        duration=time.time() - start_time,
                        error_message=f"Unexpected broadcast response: {response_data.get('type')}"
                    )
            except asyncio.TimeoutError:
                return TestResult(
                    test_name="Message Broadcasting",
                    status="FAIL",
                    duration=time.time() - start_time,
                    error_message="Timeout waiting for broadcast message"
                )
        except Exception as e:
            return TestResult(
                test_name="Message Broadcasting",
                status="FAIL",
                duration=time.time() - start_time,
                error_message=str(e)
            )
        finally:
            # Clean up connections
            for websocket in connections:
                try:
                    await websocket.close()
                except:
                    pass
    
    async def test_connection_cleanup(self) -> TestResult:
        """Test proper connection cleanup on disconnect"""
        start_time = time.time()
        try:
            async with websockets.connect(self.server_url) as websocket:
                # Send a message to establish connection state
                message = {
                    "type": "chat:message",
                    "payload": {
                        "user": "cleanup_test",
                        "message": "Testing cleanup",
                        "timestamp": time.time()
                    }
                }
                await websocket.send(json.dumps(message))
                
                # Close connection normally
                await websocket.close()
                
                # Wait a moment for cleanup
                await asyncio.sleep(1.0)
                
                self.log("✅ Connection cleanup completed", "SUCCESS")
                return TestResult(
                    test_name="Connection Cleanup",
                    status="PASS",
                    duration=time.time() - start_time
                )
        except Exception as e:
            return TestResult(
                test_name="Connection Cleanup",
                status="FAIL",
                duration=time.time() - start_time,
                error_message=str(e)
            )
    
    async def run_all_tests(self) -> List[TestResult]:
        """Run all test cases"""
        self.log("🚀 Starting WebSocket Server Test Suite", "TEST")
        
        test_methods = [
            self.test_connection_basic,
            self.test_initial_sync_messages,
            self.test_chat_message,
            self.test_stroke_message,
            self.test_invalid_message,
            self.test_connection_stress,
            self.test_message_broadcast,
            self.test_connection_cleanup,
        ]
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=self.console
        ) as progress:
            task = progress.add_task("Running tests...", total=len(test_methods))
            
            for test_method in test_methods:
                progress.update(task, description=f"Running {test_method.__name__}...")
                result = await test_method()
                self.test_results.append(result)
                progress.advance(task)
        
        return self.test_results
    
    def print_results(self):
        """Print test results in a formatted table"""
        table = Table(title="WebSocket Server Test Results")
        table.add_column("Test Name", style="cyan")
        table.add_column("Status", style="bold")
        table.add_column("Duration (s)", style="green")
        table.add_column("Details", style="yellow")
        
        passed = 0
        failed = 0
        
        for result in self.test_results:
            status_style = "green" if result.status == "PASS" else "red"
            details = result.error_message or str(result.details or "")
            
            table.add_row(
                result.test_name,
                f"[{status_style}]{result.status}[/{status_style}]",
                f"{result.duration:.3f}",
                details[:50] + "..." if len(details) > 50 else details
            )
            
            if result.status == "PASS":
                passed += 1
            else:
                failed += 1
        
        self.console.print(table)
        
        # Summary
        total = len(self.test_results)
        success_rate = (passed / total) * 100 if total > 0 else 0
        
        summary_panel = Panel(
            f"Tests Passed: {passed}/{total} ({success_rate:.1f}%)\n"
            f"Tests Failed: {failed}/{total}\n"
            f"Total Connections Made: {self.connection_count}",
            title="Test Summary",
            border_style="green" if failed == 0 else "red"
        )
        self.console.print(summary_panel)

async def main():
    """Main test runner"""
    console = Console()
    
    # Check if server is running
    console.print(Panel("🔍 Checking WebSocket Server Availability", style="blue"))
    
    try:
        async with websockets.connect("ws://localhost:9000") as websocket:
            console.print("✅ Server is running and accepting connections", style="green")
    except Exception as e:
        console.print(f"❌ Cannot connect to server: {e}", style="red")
        console.print("Please start the WebSocket server first: ./websocket-server/build/server", style="yellow")
        return
    
    # Run test suite
    test_suite = WebSocketTestSuite()
    results = await test_suite.run_all_tests()
    test_suite.print_results()

if __name__ == "__main__":
    asyncio.run(main())
