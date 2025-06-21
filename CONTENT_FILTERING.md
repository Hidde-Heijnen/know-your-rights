# Content Filtering System

## Overview

The screening chat application includes an AI-powered content filtering system that processes the free-form issue description to remove potentially biased or personal information while preserving the core legal details.

## How It Works

### 1. Context-Aware Processing
When a user enters their issue description, the system:
- Collects all previous categorical answers (eligibility, contract type, purchase method, etc.)
- Sends both the context and the issue description to Google Gemini AI
- Uses a carefully crafted prompt to filter the content

### 2. AI Filtering Criteria
The AI removes:
- Personal identifying information (names, addresses, phone numbers)
- Potentially biased language or subjective opinions
- Emotional language that could affect impartial processing
- Unnecessary details unrelated to the core legal issue

### 3. User Experience
- The filtering happens automatically when the user clicks "Continue" on the issue description step
- Both original and filtered versions are displayed side-by-side
- The system automatically advances after 3 seconds, or users can manually continue
- The filtered version is used for legal processing while the original is preserved

### 4. Fallback Mechanisms
- If AI processing fails (API errors, invalid keys), the system falls back to the original description
- If the AI cannot extract relevant information, it returns the original text
- All errors are logged and handled gracefully

## Technical Implementation

### API Route: `/api/save-screening`
- Processes the issue description with Google Gemini AI
- Saves both original and filtered versions to JSON files
- Includes comprehensive error handling and logging

### Frontend Integration
- `ScreeningChat` component manages the filtering workflow
- Real-time feedback during processing
- Side-by-side display of original vs filtered content
- Automatic step progression with manual override option

### Data Storage
- All screening data is saved to `data/` directory
- Files are timestamped for easy tracking
- Both original and filtered descriptions are preserved

## Benefits

1. **Fair Processing**: Removes bias-inducing information
2. **Privacy Protection**: Strips personal identifying details
3. **Legal Focus**: Keeps only relevant factual information
4. **Transparency**: Users can see what was filtered
5. **Reliability**: Multiple fallback mechanisms ensure the system always works

## Configuration

The system requires a valid `GOOGLE_GENERATIVE_AI_API_KEY` in the `.env` file. Without this key, the system will fall back to using the original description without filtering. 