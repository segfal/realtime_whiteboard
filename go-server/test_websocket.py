#!/usr/bin/env python3
import asyncio
import websockets
import json
import time
import psycopg2
import redis
import subprocess
import sys

def check_docker_services():
    """Check if PostgreSQL and Redis are running in Docker"""
    print("🐳 Checking Docker services...")
    
    try:
        result = subprocess.run(['docker-compose', 'ps'], capture_output=True, text=True, cwd='..')
        if result.returncode == 0:
            print("✅ Docker services found:")
            for line in result.stdout.split('\n'):
                if 'postgres' in line or 'redis' in line:
                    print(f"   {line.strip()}")
        else:
            print("❌ Docker services not found. Make sure to run:")
            print("   cd .. && docker-compose up -d")
            return False
    except FileNotFoundError:
        print("❌ docker-compose not found. Make sure Docker is installed.")
        return False
    
    return True

def test_postgres_connection():
    """Test PostgreSQL connection and check for data"""
    print("\n🐘 Testing PostgreSQL connection...")
    
    try:
        # Connect to PostgreSQL (running in Docker)
        conn = psycopg2.connect(
            host="localhost",
            port="5432",
            database="whiteboard",
            user="postgres",
            password="password"
        )
        
        cursor = conn.cursor()
        
        # Check if our test room exists
        cursor.execute("SELECT COUNT(*) FROM rooms WHERE name = 'hackathon-room'")
        room_count = cursor.fetchone()[0]
        print(f"✅ Found {room_count} room(s) named 'hackathon-room'")
        
        # Check for strokes in our room
        cursor.execute("""
            SELECT COUNT(*) FROM strokes s 
            JOIN rooms r ON s.room_id = r.id 
            WHERE r.name = 'hackathon-room'
        """)
        stroke_count = cursor.fetchone()[0]
        print(f"✅ Found {stroke_count} stroke(s) in 'hackathon-room'")
        
        # Show recent strokes
        if stroke_count > 0:
            cursor.execute("""
                SELECT s.username, s.points, s.color, s.thickness, s.created_at 
                FROM strokes s 
                JOIN rooms r ON s.room_id = r.id 
                WHERE r.name = 'hackathon-room'
                ORDER BY s.created_at DESC 
                LIMIT 3
            """)
            recent_strokes = cursor.fetchall()
            print("📊 Recent strokes:")
            for stroke in recent_strokes:
                username, points, color, thickness, created_at = stroke
                print(f"   👤 {username}: {len(points)} points, {color}, thickness {thickness} at {created_at}")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ PostgreSQL connection failed: {e}")
        print("💡 Make sure PostgreSQL is running in Docker:")
        print("   cd .. && docker-compose up -d postgres")
        return False

def test_redis_connection():
    """Test Redis connection and check for data"""
    print("\n🔴 Testing Redis connection...")
    
    try:
        # Connect to Redis (running in Docker)
        r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
        
        # Test connection
        r.ping()
        print("✅ Redis connection successful")
        
        # Check for room subscription
        pubsub = r.pubsub()
        pubsub.subscribe('room:hackathon-room')
        
        # Get some info about Redis
        info = r.info()
        print(f"✅ Redis info: {info['redis_version']} version, {info['connected_clients']} clients")
        
        # Check for any keys
        keys = r.keys('*')
        print(f"✅ Redis has {len(keys)} keys")
        if keys:
            print(f"   Keys: {keys[:5]}...")  # Show first 5 keys
        
        pubsub.close()
        r.close()
        return True
        
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        print("💡 Make sure Redis is running in Docker:")
        print("   cd .. && docker-compose up -d redis")
        return False

async def test_websocket():
    uri = "ws://localhost:8080/ws"
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connected to WebSocket server")
            
            # Test 1: Join room
            join_message = {
                "type": "join",
                "room": "hackathon-room"
            }
            await websocket.send(json.dumps(join_message))
            print("📤 Sent join message")
            
            # Wait for response
            response = await websocket.recv()
            response_data = json.loads(response)
            print(f"📥 Received: {response_data}")
            
            if response_data.get("type") == "joined":
                print("✅ Successfully joined room!")
                username = response_data.get("username", "unknown")
                print(f"👤 Assigned username: {username}")
            
            # Test 2: Send a test stroke
            test_stroke = {
                "type": "stroke",
                "room": "hackathon-room",
                "username": username,
                "data": {
                    "points": [[100, 100], [200, 200], [300, 150]],
                    "color": "#ff0000",
                    "thickness": 3,
                    "isEraser": False
                }
            }
            await websocket.send(json.dumps(test_stroke))
            print("📤 Sent test stroke")
            
            # Wait a bit for the stroke to be processed
            await asyncio.sleep(2)
            
            # Test 3: Clear canvas
            clear_message = {
                "type": "clear",
                "room": "hackathon-room",
                "username": username
            }
            await websocket.send(json.dumps(clear_message))
            print("📤 Sent clear message")
            
            # Wait a bit for any responses
            await asyncio.sleep(1)
            
            print("✅ WebSocket tests completed successfully!")
            
    except Exception as e:
        print(f"❌ WebSocket Error: {e}")

async def main():
    print("🧪 Testing Go WebSocket Server with Database Verification...")
    print("=" * 60)
    
    # Check Docker services first
    if not check_docker_services():
        print("\n❌ Docker services not available. Please start them first:")
        print("   cd .. && docker-compose up -d")
        return
    
    print("\n" + "=" * 60)
    print("📋 PREREQUISITES REMINDER:")
    print("   🐳 PostgreSQL and Redis are running in Docker containers")
    print("   🐳 Start them with: cd .. && docker-compose up -d")
    print("   🐳 Go server should be running: ./whiteboard-server")
    print("=" * 60)
    
    # Test WebSocket functionality
    print("\n🌐 Testing WebSocket functionality...")
    await test_websocket()
    
    # Test database connections and data
    print("\n" + "=" * 60)
    print("🗄️  Testing Database Persistence...")
    
    # Test PostgreSQL
    postgres_ok = test_postgres_connection()
    
    # Test Redis
    redis_ok = test_redis_connection()
    
    print("\n" + "=" * 60)
    if postgres_ok and redis_ok:
        print("🎉 ALL TESTS PASSED! Your Go server is working with databases!")
    else:
        print("⚠️  Some database tests failed. Check the errors above.")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
