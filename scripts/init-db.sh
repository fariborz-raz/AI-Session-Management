#!/bin/bash

# Database Initialization Script
# This script creates the SQLite database and initializes all tables

set -e

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Load environment variables if .env exists
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(cat "$PROJECT_ROOT/.env" | grep -v '^#' | xargs)
fi

# Database path from environment or default
DB_PATH="${DB_PATH:-sessions.db}"
DB_FULL_PATH="$PROJECT_ROOT/$DB_PATH"

echo "Initializing database at: $DB_FULL_PATH"

# Check if SQLite3 is installed
if ! command -v sqlite3 &> /dev/null; then
    echo "Error: sqlite3 is not installed. Please install it first."
    exit 1
fi

# Remove existing database if it exists
if [ -f "$DB_FULL_PATH" ]; then
    echo "Warning: Database already exists at $DB_FULL_PATH"
    read -p "Do you want to recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -f "$DB_FULL_PATH"
        echo "Removed existing database"
    else
        echo "Aborted. Using existing database."
        exit 0
    fi
fi

# Create database and run schema script
echo "Creating database and tables..."
sqlite3 "$DB_FULL_PATH" < "$SCRIPT_DIR/create-database.sql"

# Verify tables were created
TABLE_COUNT=$(sqlite3 "$DB_FULL_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('sessions', 'session_entries');")

if [ "$TABLE_COUNT" -eq 2 ]; then
    echo "✅ Database initialized successfully!"
    echo "   Tables created: sessions, session_entries"
    echo "   Database location: $DB_FULL_PATH"
else
    echo "❌ Error: Database initialization failed. Expected 2 tables, found $TABLE_COUNT"
    exit 1
fi

