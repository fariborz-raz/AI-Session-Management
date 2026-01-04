-- Database Creation Script for Therapy Session Management
-- This script creates all tables and indexes for the application
-- Run this script to initialize a fresh database or reset existing tables

-- Drop existing tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS session_entries;
DROP TABLE IF EXISTS sessions;

-- Sessions Table
-- Stores therapy session metadata
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  therapistId TEXT NOT NULL,
  clientId TEXT NOT NULL,
  startTime TEXT NOT NULL,
  summary TEXT,
  embedding TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Session Entries Table
-- Stores individual entries within a session (therapist/client messages)
CREATE TABLE IF NOT EXISTS session_entries (
  id TEXT PRIMARY KEY,
  sessionId TEXT NOT NULL,
  speaker TEXT NOT NULL CHECK(speaker IN ('therapist', 'client')),
  content TEXT,
  audioReference TEXT,
  transcript TEXT,
  timestamp TEXT NOT NULL,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sessionId) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Indexes for performance optimization

-- Index on session_entries.sessionId for faster entry lookups by session
CREATE INDEX IF NOT EXISTS idx_session_entries_sessionId 
  ON session_entries(sessionId);

-- Index on sessions.therapistId for filtering sessions by therapist
CREATE INDEX IF NOT EXISTS idx_sessions_therapistId 
  ON sessions(therapistId);

-- Index on sessions.clientId for filtering sessions by client
CREATE INDEX IF NOT EXISTS idx_sessions_clientId 
  ON sessions(clientId);

-- Index on session_entries.timestamp for sorting entries chronologically
CREATE INDEX IF NOT EXISTS idx_session_entries_timestamp 
  ON session_entries(timestamp);

-- Index on sessions.startTime for sorting sessions chronologically
CREATE INDEX IF NOT EXISTS idx_sessions_startTime 
  ON sessions(startTime);

-- Index on sessions.createdAt for filtering by creation date
CREATE INDEX IF NOT EXISTS idx_sessions_createdAt 
  ON sessions(createdAt);

-- Verify tables were created
SELECT name FROM sqlite_master WHERE type='table' AND name IN ('sessions', 'session_entries');
SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%';

