# Content Filtering for Bias Removal

## Overview

The screening system now includes AI-powered content filtering to remove personal information and potentially biased details from user descriptions. This ensures that only relevant, objective information is used for processing, preventing implicit bias in later analysis.

**NEW: Context-Aware Filtering** - The AI now considers all categorical data from previous screening questions when processing the issue description, providing more accurate and contextually relevant filtering.

## How It Works

When a user submits their issue description, the system:

1. **Captures the original description** for reference
2. **Uses AI to filter the content** with full context from all previous answers
3. **Removes personal information** and potentially biased details
4. **Considers contract type, purchase method, and other context** for better categorization
5. **Saves both versions** - original and filtered
6. **Displays the comparison** to the user in the UI

## Context Data Used for Filtering

The AI now receives the following context from previous screening questions:

- **Purchase in UK**: Yes/No
- **Acting for personal purposes**: Yes/No  
- **Seller acting for business**: Yes/No
- **Receive date**: When goods/services were received
- **Contract type**: Tangible goods, Digital content, A service, or A mix
- **Contract arrangement**: One-off sale, Hire of goods, Hire-purchase, or Transfer
- **Purchased at auction**: Yes/No
- **Purchase method**: In person, Online/distance, or Off-premises/doorstep

## What Gets Filtered Out

### Personal Information
- Names of people, places, or businesses
- Specific product details (colors, brands, models)
- Location information
- Personal identifiers

### Potentially Biased Content
- Emotional language ("I'm really upset", "I hate this")
- Subjective opinions ("expensive piece of junk")
- Irrelevant details that don't relate to the core issue
- Language that could introduce bias in processing

## What Gets Preserved

### Core Technical/Legal Information
- Functional problems ("not functioning properly")
- Technical issues ("overheating", "shutting down")
- Product deterioration ("falling apart", "deteriorating")
- Service delivery problems
- Contract-related issues

## Enhanced Examples with Context

### Example 1: Tangible Goods (Online Purchase)
**Context:** Contract type: Tangible goods, Purchase method: Online
**Original:** "My red iPhone 14 from Apple Store in London is broken and I'm really upset about it. The blue case I bought with it is also falling apart. I hate this expensive piece of junk!"
**Filtered:** "Tangible goods, mobile phone, is not functioning properly"

### Example 2: Digital Content (Online Purchase)
**Context:** Contract type: Digital content, Purchase method: Online
**Original:** "The tax software I bought online from a dedicated website is doing what was advertised online, like giving me insight about the current law, and when it does, it is outdated"
**Filtered:** "Digital content, software, is not functioning properly and outdated"

### Example 3: Service (In Person)
**Context:** Contract type: A service, Purchase method: In person
**Original:** "The cleaning service I hired is terrible and they didn't show up"
**Filtered:** "A service, cleaning service, service not provided as agreed"

### Example 4: Tangible Goods (Off-premises)
**Context:** Contract type: Tangible goods, Purchase method: Off-premises
**Original:** "The white MacBook Pro from John's store is overheating and shutting down constantly. I paid £2000 for this and it's been nothing but trouble!"
**Filtered:** "Tangible goods, computer, is overheating and shutting down"

## Implementation Details

### API Endpoint
- **Route:** `/api/save-screening`
- **Method:** POST
- **Function:** `filterIssueDescription(description, screeningData)`

### AI Model
- **Model:** Google Gemini 1.5 Pro
- **Purpose:** Context-aware content filtering and bias removal
- **Fallback:** Returns original description if AI fails

### Data Structure
```json
{
  "purchase_uk": "yes",
  "acting_personal": "yes", 
  "seller_trader": "yes",
  "receive_date": "2024-01-15",
  "contract_main": "goods",
  "contract_type": "one_off",
  "auction": "no",
  "purchase_method": "online",
  "issue_description": "Original user input",
  "issue_description_filtered": "AI-filtered, context-aware version"
}
```

### UI Display
The screening chat component shows both versions in the summary:
- **Original description** (in red) - what the user actually wrote
- **Filtered description** (in green) - what gets used for processing
- **Explanation** of what was removed and why

## Benefits

1. **Prevents Bias:** Removes information that could introduce implicit bias
2. **Improves Fairness:** Ensures all cases are processed based on objective facts
3. **Maintains Transparency:** Users can see exactly what information is being used
4. **Preserves Context:** Original description is kept for reference
5. **Legal Compliance:** Helps ensure fair treatment regardless of personal characteristics
6. **Enhanced Accuracy:** Context-aware filtering provides more relevant categorization
7. **Better Categorization:** Contract type and purchase method inform issue classification

## Technical Notes

- The filtering uses a carefully crafted prompt that includes all screening context
- The system gracefully handles AI failures by falling back to the original
- Both versions are saved for audit and transparency purposes
- The filtering is applied automatically when data is saved
- Users can see the filtering results in real-time in the UI
- Context data is converted to human-readable labels before being sent to AI

## Future Enhancements

- Configurable filtering rules
- Industry-specific filtering patterns
- User feedback on filtering accuracy
- Batch processing for existing data
- Integration with legal compliance frameworks
- Machine learning model training on filtered data 